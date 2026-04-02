import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { handleSupabaseError, OperationType } from '../lib/supabaseHelpers';
import { motion, AnimatePresence } from 'motion/react';
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
  Lock,
  ExternalLink,
  Edit3,
  X,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { differenceInDays, format, startOfDay, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { 
  generateManualWhatsAppLink, 
  logWhatsAppMessage, 
  sendAutoWhatsAppMessage, 
  WhatsAppConfig, 
  WhatsAppLog 
} from '../lib/whatsapp';

interface Asistencia {
  id: string;
  socio_id: string;
  fecha: string;
}

interface Notification {
  id: string;
  socio_id: string;
  socio_nombre: string;
  tipo: 'vencimiento' | 'rutina' | 'promocion';
  mensaje: string;
  fecha: string;
  estado: 'enviado' | 'pendiente';
}

export default function RetentionView({ socios, sucursalId }: { socios: Socio[], sucursalId: string }) {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'risk' | 'notifications'>('risk');
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  
  // Custom Message States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSocio, setSelectedSocio] = useState<any>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchData();
  }, [sucursalId, socios]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Config
      const { data: configData } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('sucursal_id', sucursalId)
        .single();
      
      setConfig(configData);

      // 2. Fetch Logs
      const { data: logData } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .eq('sucursal_id', sucursalId)
        .order('sent_at', { ascending: false });
      
      setLogs(logData || []);

      // 3. Fetch Asistencias
      const { data, error } = await supabase
        .from('asistencias')
        .select('*')
        .eq('sucursal_id', sucursalId)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setAsistencias(data || []);

    } catch (error) {
      handleSupabaseError(error, OperationType.READ, 'RetentionView');
    } finally {
      setLoading(false);
    }
  };

  const openPersonalizationModal = (item: any) => {
    if (!item) return;
    
    // Safety check for regex match
    const daysMatch = (item.detalle || '').match(/\d+/);
    const days = daysMatch ? daysMatch[0] : (item.tipo === 'Por vencer' ? 'pocos' : 'varios');
    const socioName = item.nombre || 'Socio';
    
    const defaultMsg = item.tipo === 'Por vencer' 
      ? `Hola ${socioName}, te recordamos que tu membresía vence en ${days} días. ¡Te esperamos para renovar!`
      : `Hola ${socioName}, notamos que no has venido en ${days} días. ¡Vuelve pronto a entrenar!`;
    
    setSelectedSocio(item);
    setCustomMessage(defaultMsg);
    setIsModalOpen(true);
  };

  const handleManualSend = async (socio: any, message: string) => {
    if (!socio.telefono) {
      toast.error("El socio no tiene teléfono registrado");
      return;
    }

    const link = generateManualWhatsAppLink(socio.telefono, message);
    window.open(link, '_blank');

    await logWhatsAppMessage({
      socio_id: socio.id,
      message_type: socio.tipo === 'Por vencer' ? 'expiry' : 'absence',
      send_mode: 'manual',
      status: 'sent',
      message_text: message,
      sucursal_id: sucursalId
    });

    setIsModalOpen(false);
    fetchData();
  };

  const handleAutoSend = async (socio: any, message: string) => {
    if (!config) {
      toast.error("Configura la API de Meta en Panel -> Configuración");
      return;
    }

    if (!socio.telefono) {
      toast.error("El socio no tiene teléfono registrado");
      return;
    }

    setSending(true);
    try {
      const result = await sendAutoWhatsAppMessage(
        config, 
        socio, 
        'recordatorio_retencion', 
        [socio.nombre, message]
      );

      await logWhatsAppMessage({
        socio_id: socio.id,
        message_type: socio.tipo === 'Por vencer' ? 'expiry' : 'absence',
        send_mode: 'auto',
        status: result.success ? 'sent' : 'failed',
        message_text: message,
        error_message: result.error,
        meta_message_id: result.messageId,
        sucursal_id: sucursalId
      });

      if (result.success) {
        toast.success("Mensaje automático enviado");
      } else {
        toast.error(`Error de Meta: ${result.error}`);
      }
    } catch (error: any) {
      toast.error("Error al conectar con Meta");
    } finally {
      setSending(false);
      setIsModalOpen(false);
      fetchData();
    }
  };

  // 1. Membresías por Vencer (Próximos 3 días)
  const expiringSoon = socios.filter(s => {
    if (!s.fecha_vencimiento) return false;
    const daysLeft = differenceInDays(new Date(s.fecha_vencimiento), startOfDay(new Date()));
    return daysLeft >= 0 && daysLeft <= 3 && s.estado === 'Activa';
  });

  // 2. Socios Ausentes (Cambiado a 5 DÍAS según solicitud del usuario)
  const absentSocios = socios.filter(s => {
    const socioAsistencias = asistencias.filter(a => a.socio_id === s.id);
    if (socioAsistencias.length === 0) return true; // Nunca vino

    const lastAsist = new Date(socioAsistencias[0].fecha);
    const daysSinceLast = differenceInDays(startOfDay(new Date()), startOfDay(lastAsist));
    return daysSinceLast >= 5;
  }).map(s => {
    const socioAsistencias = asistencias.filter(a => a.socio_id === s.id);
    const lastAsist = socioAsistencias.length > 0 ? new Date(socioAsistencias[0].fecha) : null;
    return { ...s, lastAsistencia: lastAsist };
  });


  const riskList = [
    ...expiringSoon.map(s => {
      const socioAsistencias = asistencias.filter(a => a.socio_id === s.id);
      const lastAsist = socioAsistencias.length > 0 ? new Date(socioAsistencias[0].fecha) : null;
      return {
        ...s,
        tipo: 'Por vencer',
        detalle: `Vence en ${differenceInDays(new Date(s.fecha_vencimiento!), startOfDay(new Date()))} días`,
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
        lastLog: logs.find(l => l.socio_id === s.id),
        lastAsistencia: lastAsist
      };
    }),
    ...absentSocios.map(s => ({
      ...s,
      tipo: 'Ausente',
      detalle: s.lastAsistencia 
        ? `Hace ${differenceInDays(startOfDay(new Date()), startOfDay(s.lastAsistencia))} días` 
        : 'Sin registros',
      ultimaAsistencia: s.lastAsistencia,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      lastLog: logs.find(l => l.socio_id === s.id)
    }))
  ].sort((a, b) => {
    if (a.tipo === 'Ausente' && b.tipo === 'Por vencer') return 1;
    if (a.tipo === 'Por vencer' && b.tipo === 'Ausente') return -1;
    return 0;
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
                  <p className="text-sm text-yellow-400 font-medium">Más de 5 días sin asistir</p>
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
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-200">{item.nombre}</span>
                                <span className="text-[10px] text-gray-500 font-mono">{item.telefono || 'Sin teléfono'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col gap-2">
                              <div className={cn(
                                "inline-flex flex-col px-3 py-1.5 rounded-xl border w-fit",
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
                              {item.lastLog && (
                                <span className="text-[10px] text-green-500/70 font-bold flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Contactado {format(new Date(item.lastLog.sent_at!), 'dd/MM HH:mm')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2 text-gray-400">
                              <Calendar className="w-4 h-4 opacity-40" />
                              <span className="text-sm">
                                {item.lastAsistencia 
                                  ? format(new Date(item.lastAsistencia), 'dd MMM, yyyy') 
                                  : 'Nunca registrado'}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openPersonalizationModal(item)}
                                className="p-3 bg-white/5 hover:bg-orange-500 text-gray-400 hover:text-black rounded-xl transition-all border border-white/5 active:scale-95"
                                title="Personalizar y enviar"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => handleManualSend(item, `Hola ${item.nombre}, ¡te extrañamos en el gym! Vuelve pronto.`)}
                                className="p-3 bg-white/5 hover:bg-green-500 text-gray-400 hover:text-black rounded-xl transition-all border border-white/5 active:scale-95"
                                title="WhatsApp Web Rápido"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            </div>
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
                <p className="text-3xl font-black text-white">{logs.length}</p>
              </div>
              <div className="bg-[#111] border border-white/10 p-6 rounded-3xl">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Impacto Retención</p>
                <p className="text-3xl font-black text-lime-500">+15%</p>
              </div>
              <div className="bg-[#111] border border-white/10 p-6 rounded-3xl">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Canal Principal</p>
                <p className="text-3xl font-black text-white">WA</p>
              </div>
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
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-gray-500">
                        No hay historial de comunicaciones.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const socio = socios.find(s => s.id === log.socio_id);
                      return (
                        <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-8 py-6 font-bold text-gray-200">{socio?.nombre || 'Socio eliminado'}</td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                              log.message_type === 'expiry' ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                              "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                            )}>
                              {log.message_type === 'expiry' ? 'vencimiento' : 'ausencia'}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-sm text-gray-400 max-w-xs truncate">{log.message_text}</td>
                          <td className="px-8 py-6 text-sm text-gray-500">
                            {log.sent_at ? format(new Date(log.sent_at), 'dd/MM HH:mm') : 'Recién'}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase",
                              log.status === 'sent' ? "text-lime-500" : "text-red-500"
                            )}>
                              {log.status === 'sent' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PERSONALIZACIÓN */}
      <AnimatePresence>
        {isModalOpen && selectedSocio && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Personalizar Mensaje</h3>
                      <p className="text-xs text-gray-500">Enviando a {selectedSocio.nombre}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Contenido del WhatsApp</label>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="w-full h-40 bg-black border border-white/10 rounded-2xl py-4 px-5 focus:outline-none focus:border-orange-500 transition-all text-white text-sm leading-relaxed resize-none"
                      placeholder="Escribe tu mensaje personalizado aquí..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleManualSend(selectedSocio, customMessage)}
                      className="flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all border border-white/5"
                    >
                      <ExternalLink className="w-4 h-4" />
                      WhatsApp Web
                    </button>
                    <button
                      disabled={!config || sending}
                      onClick={() => handleAutoSend(selectedSocio, customMessage)}
                      className="flex items-center justify-center gap-2 py-4 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-black font-bold rounded-2xl transition-all shadow-lg shadow-green-500/20"
                    >
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      Envío Automático
                    </button>
                  </div>
                  
                  {!config && (
                    <p className="text-[10px] text-center text-orange-500/60 font-bold uppercase tracking-widest">
                      * API de Meta no configurada para envío automático
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
