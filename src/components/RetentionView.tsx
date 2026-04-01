import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp, where, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion } from 'motion/react';
import { Socio } from '../types';
import { 
  AlertTriangle, 
  UserMinus, 
  MessageCircle, 
  Calendar,
  Clock,
  Send,
  History,
  Settings2,
  Bell,
  Zap,
  BellRing,
  Lock
} from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface Asistencia {
  id: string;
  socioId: string;
  fecha: Timestamp;
}

interface Notification {
  id: string;
  socioId: string;
  socioNombre: string;
  tipo: 'vencimiento' | 'rutina' | 'promocion';
  mensaje: string;
  fecha: Timestamp;
  estado: 'enviado' | 'pendiente';
}

export default function RetentionView({ socios, sucursalId }: { socios: Socio[], sucursalId: string }) {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'risk' | 'notifications'>('risk');

  useEffect(() => {
    const qAsistencias = query(
      collection(db, 'asistencias'), 
      where('sucursalId', '==', sucursalId),
      orderBy('fecha', 'desc')
    );
    
    const unsubscribeAsistencias = onSnapshot(qAsistencias, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Asistencia[];
      setAsistencias(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'asistencias');
    });

    const qNotifications = query(
      collection(db, 'notifications'),
      where('sucursalId', '==', sucursalId),
      orderBy('fecha', 'desc'),
      limit(50)
    );

    const unsubscribeNotifications = onSnapshot(qNotifications, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
      setLoading(false);
    });

    return () => {
      unsubscribeAsistencias();
      unsubscribeNotifications();
    };
  }, [sucursalId]);

  // 1. Membresías por Vencer (Próximos 3 días)
  const expiringSoon = socios.filter(s => {
    const daysLeft = differenceInDays(s.fechaVencimiento.toDate(), new Date());
    return daysLeft >= 0 && daysLeft <= 3 && s.estado === 'Activa';
  });

  // 2. Socios Ausentes (Más de 7 días sin venir)
  const absentSocios = socios.filter(s => {
    const socioAsistencias = asistencias.filter(a => a.socioId === s.id);
    if (socioAsistencias.length === 0) return true; // Never came
    
    const lastAsistencia = socioAsistencias[0]; // Already ordered by date desc
    const daysSinceLast = differenceInDays(new Date(), lastAsistencia.fecha.toDate());
    return daysSinceLast > 7;
  }).map(s => {
    const socioAsistencias = asistencias.filter(a => a.socioId === s.id);
    const lastAsistencia = socioAsistencias.length > 0 ? socioAsistencias[0].fecha.toDate() : null;
    return { ...s, lastAsistencia };
  });

  const handleAction = (nombre: string) => {
    toast.success(`Mensaje de WhatsApp enviado a ${nombre}`, {
      description: "Simulación de envío exitosa. Integración con Meta API preparada.",
      duration: 4000,
    });
  };

  const handleAutomateVencimientos = async () => {
    const toastId = toast.loading("Analizando socios y preparando notificaciones...");
    
    try {
      let count = 0;
      for (const socio of expiringSoon) {
        // Check if already notified today for vencimiento
        const alreadyNotified = notifications.some(n => 
          n.socioId === socio.id && 
          n.tipo === 'vencimiento' && 
          n.fecha && 
          differenceInDays(new Date(), n.fecha.toDate()) === 0
        );
        
        if (!alreadyNotified) {
          const daysLeft = differenceInDays(socio.fechaVencimiento.toDate(), new Date());
          await addDoc(collection(db, 'notifications'), {
            socioId: socio.id,
            socioNombre: socio.nombre,
            tipo: 'vencimiento',
            mensaje: `Hola ${socio.nombre}, tu membresía vence en ${daysLeft} días. ¡No olvides renovar!`,
            fecha: serverTimestamp(),
            estado: 'enviado',
            sucursalId
          });
          count++;
        }
      }

      if (count === 0) {
        toast.info("No hay nuevos socios por notificar hoy.", { id: toastId });
      } else {
        toast.success(`Se enviaron ${count} notificaciones automáticas`, { id: toastId });
      }
    } catch (error) {
      toast.error("Error al automatizar notificaciones", { id: toastId });
      handleFirestoreError(error, OperationType.CREATE, 'notifications');
    }
  };

  const handleSendPromotion = async () => {
    const activeSocios = socios.filter(s => s.estado === 'Activa');
    if (activeSocios.length === 0) {
      toast.error("No hay socios activos para enviar promociones.");
      return;
    }

    const toastId = toast.loading("Enviando promoción a todos los socios activos...");

    try {
      const promoMsg = "¡Nueva promoción! 20% de descuento en suplementos esta semana.";
      for (const s of activeSocios) {
        await addDoc(collection(db, 'notifications'), {
          socioId: s.id,
          socioNombre: s.nombre,
          tipo: 'promocion',
          mensaje: promoMsg,
          fecha: serverTimestamp(),
          estado: 'enviado',
          sucursalId
        });
      }
      toast.success(`Promoción enviada a ${activeSocios.length} socios.`, { id: toastId });
    } catch (error) {
      toast.error("Error al enviar promoción", { id: toastId });
      handleFirestoreError(error, OperationType.CREATE, 'notifications');
    }
  };

  const riskList = [
    ...expiringSoon.map(s => ({
      id: s.id,
      nombre: s.nombre,
      tipo: 'Por vencer',
      detalle: `Vence en ${differenceInDays(s.fechaVencimiento.toDate(), new Date())} días`,
      ultimaAsistencia: asistencias.find(a => a.socioId === s.id)?.fecha.toDate() || null,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20'
    })),
    ...absentSocios.map(s => ({
      id: s.id,
      nombre: s.nombre,
      tipo: 'Ausente',
      detalle: s.lastAsistencia 
        ? `Hace ${differenceInDays(new Date(), s.lastAsistencia)} días` 
        : 'Sin registros',
      ultimaAsistencia: s.lastAsistencia,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20'
    }))
  ].sort((a, b) => {
    if (!a.ultimaAsistencia) return 1;
    if (!b.ultimaAsistencia) return -1;
    return a.ultimaAsistencia.getTime() - b.ultimaAsistencia.getTime();
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <BellRing className="w-8 h-8 text-orange-500" />
            Panel de Retención
          </h2>
          <p className="text-gray-500 mt-1">Monitorea y automatiza la comunicación con tus socios</p>
        </div>

        <div className="flex bg-[#111] p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('risk')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'risk' ? 'bg-orange-500 text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Riesgo
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'notifications' ? 'bg-orange-500 text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            Notificaciones
          </button>
        </div>
      </div>

      {activeTab === 'risk' ? (
        <>
          {/* Alert Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-orange-500/20 to-transparent border border-orange-500/30 p-8 rounded-[2.5rem] relative overflow-hidden group">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-orange-500/60 mb-2">Próximos Vencimientos</p>
                  <h3 className="text-4xl font-black text-white mb-1">{expiringSoon.length}</h3>
                  <p className="text-sm text-orange-400 font-medium">Membresías por vencer (3 días)</p>
                </div>
                <div className="w-16 h-16 bg-orange-500/20 rounded-3xl flex items-center justify-center border border-orange-500/30">
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all" />
            </div>

            <div className="bg-gradient-to-br from-yellow-500/20 to-transparent border border-yellow-500/30 p-8 rounded-[2.5rem] relative overflow-hidden group">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-yellow-500/60 mb-2">Socios Ausentes</p>
                  <h3 className="text-4xl font-black text-white mb-1">{absentSocios.length}</h3>
                  <p className="text-sm text-yellow-400 font-medium">Más de 7 días sin asistir</p>
                </div>
                <div className="w-16 h-16 bg-yellow-500/20 rounded-3xl flex items-center justify-center border border-yellow-500/30">
                  <UserMinus className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl group-hover:bg-yellow-500/20 transition-all" />
            </div>
          </div>

          {/* Action Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                Lista de Acción Rápida
                <span className="text-xs font-medium bg-white/5 px-2 py-1 rounded-md text-gray-500">{riskList.length} socios en riesgo</span>
              </h3>
              <button
                onClick={handleAutomateVencimientos}
                className="bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-500/20"
              >
                <Settings2 className="w-4 h-4" />
                Automatizar Notificaciones
              </button>
            </div>

            <div className="bg-[#111] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5">
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Socio</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Estado de Riesgo</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Última Asistencia</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-gray-500 text-sm font-medium">Analizando patrones de asistencia...</span>
                          </div>
                        </td>
                      </tr>
                    ) : riskList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
                              <Clock className="w-8 h-8 text-green-500" />
                            </div>
                            <div>
                              <p className="text-white font-bold">¡Todo bajo control!</p>
                              <p className="text-gray-500 text-sm">No hay socios en riesgo de deserción actualmente.</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      riskList.map((item) => (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-gray-400 font-bold">
                                {item.nombre.charAt(0)}
                              </div>
                              <span className="font-bold text-gray-200">{item.nombre}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className={cn(
                              "inline-flex flex-col px-3 py-1.5 rounded-xl border",
                              item.bgColor,
                              item.borderColor
                            )}>
                              <span className={cn("text-[10px] font-black uppercase tracking-widest", item.color)}>
                                {item.tipo}
                              </span>
                              <span className="text-xs text-white/60 font-medium">
                                {item.detalle}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2 text-gray-400">
                              <Calendar className="w-4 h-4 opacity-40" />
                              <span className="text-sm">
                                {item.ultimaAsistencia 
                                  ? format(item.ultimaAsistencia, 'dd MMM, yyyy') 
                                  : 'Nunca registrado'}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button
                              onClick={() => handleAction(item.nombre)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-green-400 transition-all active:scale-95 shadow-lg shadow-green-500/20"
                            >
                              <MessageCircle className="w-4 h-4" />
                              Contactar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              <div className="bg-[#111] border border-white/10 p-6 rounded-3xl">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total Enviadas</p>
                <p className="text-3xl font-black text-white">{notifications.length}</p>
              </div>
              <div className="bg-[#111] border border-white/10 p-6 rounded-3xl">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Pendientes</p>
                <p className="text-3xl font-black text-orange-500">0</p>
              </div>
              <div className="bg-[#111] border border-white/10 p-6 rounded-3xl">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Tasa de Apertura</p>
                <p className="text-3xl font-black text-lime-500">92%</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <button
                onClick={handleAutomateVencimientos}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-black rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-orange-400 transition-all active:scale-95 shadow-lg shadow-orange-500/20"
              >
                <Zap className="w-4 h-4" />
                Auto-Vencimientos
              </button>
              <button
                onClick={handleSendPromotion}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
              >
                <Bell className="w-4 h-4" />
                Enviar Promoción
              </button>
            </div>
          </div>

          <div className="bg-[#111] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Socio</th>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Tipo</th>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Mensaje</th>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Fecha</th>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {notifications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-gray-500">
                        No hay historial de notificaciones.
                      </td>
                    </tr>
                  ) : (
                    notifications.map((notif) => (
                      <tr key={notif.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-8 py-6 font-bold text-gray-200">{notif.socioNombre}</td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                            notif.tipo === 'vencimiento' ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                            notif.tipo === 'rutina' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                            "bg-lime-500/10 text-lime-500 border-lime-500/20"
                          )}>
                            {notif.tipo}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-sm text-gray-400 max-w-xs truncate">{notif.mensaje}</td>
                        <td className="px-8 py-6 text-sm text-gray-500">
                          {notif.fecha ? format(notif.fecha.toDate(), 'dd/MM HH:mm') : 'Recién'}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase text-lime-500">
                            <Send className="w-3 h-3" />
                            {notif.estado}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
