import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion } from 'motion/react';
import { Socio } from '../types';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  UserX, 
  AlertCircle,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Lock as LockIcon
} from 'lucide-react';
import { differenceInDays, format, subDays, isAfter, startOfDay } from 'date-fns';
import { cn } from '../lib/utils';

interface Asistencia {
  socioId: string;
  fecha: Timestamp;
}

interface Suggestion {
  socio: Socio;
  type: 'expiry' | 'absence';
  message: string;
  daysInfo: number;
}

export default function WhatsAppModule({ socios, sucursalId }: { socios: Socio[], sucursalId: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateSuggestions = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const sevenDaysAgo = subDays(today, 7);
        const newSuggestions: Suggestion[] = [];

        // 1. Check for expiry in 3 days or less
        socios.forEach(socio => {
          const daysLeft = differenceInDays(socio.fechaVencimiento.toDate(), today);
          if (daysLeft <= 3 && socio.estado === 'Activa') {
            const dateStr = format(socio.fechaVencimiento.toDate(), 'dd/MM/yyyy');
            newSuggestions.push({
              socio,
              type: 'expiry',
              message: `Hola ${socio.nombre}, tu membresía en Gariba Gym vence el ${dateStr}. ¡Renueva para no perder tu racha!`,
              daysInfo: daysLeft
            });
          }
        });

        // 2. Check for absence > 7 days
        // We need to fetch the last attendance for each socio
        const asistenciasRef = collection(db, 'asistencias');
        const lastAsistencias: Record<string, Date> = {};

        // Fetch all asistencias from the last 30 days for this branch
        const q = query(
          asistenciasRef, 
          where('sucursalId', '==', sucursalId),
          where('fecha', '>=', Timestamp.fromDate(subDays(today, 30))),
          orderBy('fecha', 'desc')
        );
        const snapshot = await getDocs(q);
        
        snapshot.docs.forEach(doc => {
          const data = doc.data() as Asistencia;
          if (!lastAsistencias[data.socioId]) {
            lastAsistencias[data.socioId] = data.fecha.toDate();
          }
        });

        socios.forEach(socio => {
          const lastDate = lastAsistencias[socio.id];
          if (lastDate) {
            const daysAbsent = differenceInDays(today, lastDate);
            if (daysAbsent > 7) {
              // Avoid duplicate if already in expiry list (optional, but let's keep both if relevant)
              newSuggestions.push({
                socio,
                type: 'absence',
                message: `Hola ${socio.nombre}, ¡te extrañamos en Gariba Gym! Vuelve a entrenar hoy.`,
                daysInfo: daysAbsent
              });
            }
          } else {
            // Never attended? Maybe they are new or haven't come in 30+ days
            // For this demo, let's only suggest if they have at least one record in the last 30 days but > 7 days ago
          }
        });

        setSuggestions(newSuggestions);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'asistencias');
      } finally {
        setLoading(false);
      }
    };

    generateSuggestions();
  }, [socios]);

  const handleSendWhatsApp = (socio: Socio, message: string) => {
    if (!socio.telefono) {
      alert("Este socio no tiene un número de teléfono registrado.");
      return;
    }
    
    // Clean phone number (remove non-digits)
    const cleanPhone = socio.telefono.replace(/\D/g, '');
    const encodedMsg = encodeURIComponent(message);
    const url = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-green-500" />
            Central de Comunicaciones
          </h2>
          <p className="text-gray-500 mt-1">Mensajes sugeridos para retención y cobranza</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-green-500">WhatsApp Activo</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Analizando base de datos...</p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="bg-[#111] border border-white/10 rounded-3xl p-12 text-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-gray-700" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">¡Todo al día!</h3>
          <p className="text-gray-500 max-w-md mx-auto">No hay mensajes pendientes de cobranza o inasistencia por el momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {suggestions.map((suggestion, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={`${suggestion.socio.id}-${suggestion.type}`}
              className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden group hover:border-green-500/30 transition-all"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center",
                      suggestion.type === 'expiry' ? "bg-orange-500/10 text-orange-500" : "bg-blue-500/10 text-blue-500"
                    )}>
                      {suggestion.type === 'expiry' ? <Clock className="w-6 h-6" /> : <UserX className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-white">{suggestion.socio.nombre}</h4>
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                        <span className={suggestion.type === 'expiry' ? "text-orange-500" : "text-blue-500"}>
                          {suggestion.type === 'expiry' ? 'Vencimiento Próximo' : 'Inasistencia Prolongada'}
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-500">
                          {suggestion.type === 'expiry' 
                            ? (suggestion.daysInfo < 0 ? 'Vencido' : `En ${suggestion.daysInfo} días`)
                            : `${suggestion.daysInfo} días ausente`}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sugerido</span>
                  </div>
                </div>

                <div className="bg-black/40 rounded-2xl p-4 mb-6 border border-white/5 relative">
                  <p className="text-sm text-gray-300 leading-relaxed italic">
                    "{suggestion.message}"
                  </p>
                  <div className="absolute -top-2 -left-2 bg-green-500 w-5 h-5 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-3 h-3 text-black" />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">WhatsApp</span>
                    <span className="text-sm font-mono text-gray-300">{suggestion.socio.telefono || 'No registrado'}</span>
                  </div>
                  
                  <button
                    onClick={() => handleSendWhatsApp(suggestion.socio, suggestion.message)}
                    className="bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 px-6 rounded-2xl flex items-center gap-3 transition-all active:scale-95 shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40"
                  >
                    <Send className="w-5 h-5" />
                    Enviar
                    <ExternalLink className="w-4 h-4 opacity-50" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20 rounded-3xl p-8">
        <div className="flex items-start gap-6">
          <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-green-500/20">
            <AlertCircle className="w-8 h-8 text-black" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Estrategia de Retención</h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
              El contacto directo vía WhatsApp aumenta la tasa de renovación en un 40%. 
              Utiliza estos mensajes sugeridos para mantener a tus socios motivados y al día con sus pagos. 
              Recuerda que un socio que no asiste por más de una semana tiene un alto riesgo de abandono.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
