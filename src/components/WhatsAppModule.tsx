import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { handleSupabaseError, OperationType } from '../lib/supabaseHelpers';
import { motion, AnimatePresence } from 'motion/react';
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
  History,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Info
} from 'lucide-react';
import { differenceInDays, format, subDays, isAfter, startOfDay, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { 
  generateManualWhatsAppLink, 
  logWhatsAppMessage, 
  sendAutoWhatsAppMessage, 
  WhatsAppConfig, 
  WhatsAppLog 
} from '../lib/whatsapp';
import { toast } from 'sonner';

interface ImpactedSocio extends Socio {
  daysRemaining: number;
  lastLog?: WhatsAppLog;
}

export default function WhatsAppModule({ socios, sucursalId }: { socios: Socio[], sucursalId: string }) {
  const [impactedSocios, setImpactedSocios] = useState<ImpactedSocio[]>([]);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'pending' | 'history'>('pending');
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [socios, sucursalId]);

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
      const { data: logData, error: logError } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .eq('sucursal_id', sucursalId)
        .order('sent_at', { ascending: false });
      
      if (logError) throw logError;
      setLogs(logData || []);

      // 3. Filter impacted socios
      const today = startOfDay(new Date());
      const filtered = socios
        .filter(s => {
          if (!s.fecha_vencimiento) return false;
          const expiryDate = parseISO(s.fecha_vencimiento);
          const days = differenceInDays(expiryDate, today);
          return s.estado === 'Vencida' || days <= 7;
        })
        .map(s => {
          const expiryDate = parseISO(s.fecha_vencimiento);
          const days = differenceInDays(expiryDate, today);
          const lastLog = logData?.find(l => l.socio_id === s.id);
          return { ...s, daysRemaining: days, lastLog };
        })
        .sort((a, b) => a.daysRemaining - b.daysRemaining);

      setImpactedSocios(filtered);
    } catch (error) {
      handleSupabaseError(error, OperationType.READ, 'WhatsAppModule');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSend = async (socio: ImpactedSocio) => {
    if (!socio.telefono) {
      toast.error("El socio no tiene teléfono registrado");
      return;
    }

    const message = socio.daysRemaining < 0 
      ? `Hola ${socio.nombre}, notamos que tu membresía en Gariba Gym venció hace ${Math.abs(socio.daysRemaining)} días. ¡Te extrañamos! Renueva hoy para seguir entrenando.`
      : `Hola ${socio.nombre}, te recordamos que tu membresía en Gariba Gym vence en ${socio.daysRemaining} días. ¡Asegura tu lugar renovando con tiempo!`;

    const link = generateManualWhatsAppLink(socio.telefono, message);
    window.open(link, '_blank');

    await logWhatsAppMessage({
      socio_id: socio.id,
      message_type: 'expiry',
      send_mode: 'manual',
      status: 'sent',
      message_text: message,
      sucursal_id: sucursalId
    });

    fetchData(); // Refresh to show last contact
  };

  const handleAutoSend = async (socio: ImpactedSocio) => {
    if (!config) {
      toast.error("Configura la API de Meta en Panel -> Configuración");
      return;
    }

    if (!socio.telefono) {
      toast.error("El socio no tiene teléfono registrado");
      return;
    }

    setSendingId(socio.id);
    try {
      // For this demo, we assume a template named 'recordatorio_vencimiento'
      // Replace with your actual Meta template name
      const result = await sendAutoWhatsAppMessage(
        config, 
        socio, 
        'recordatorio_vencimiento', 
        [socio.nombre, socio.daysRemaining.toString()]
      );

      await logWhatsAppMessage({
        socio_id: socio.id,
        message_type: 'expiry',
        send_mode: 'auto',
        status: result.success ? 'sent' : 'failed',
        message_text: `Template: recordatorio_vencimiento | Params: ${socio.nombre}, ${socio.daysRemaining}`,
        error_message: result.error,
        meta_message_id: result.messageId,
        sucursal_id: sucursalId
      });

      if (result.success) {
        toast.success("Mensaje automático enviado con éxito");
      } else {
        toast.error(`Error de Meta API: ${result.error}`);
      }
    } catch (error: any) {
      toast.error("Error al conectar con Meta");
    } finally {
      setSendingId(null);
      fetchData();
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
              <MessageSquare className="w-7 h-7 text-black" />
            </div>
            Central de Comunicaciones
          </h2>
          <p className="text-gray-500 mt-2">Módulo de Retención y Cobranza Automatizada</p>
        </div>

        <div className="flex bg-[#111] p-1.5 rounded-2xl border border-white/10 self-start md:self-center">
          <button
            onClick={() => setView('pending')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              view === 'pending' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"
            )}
          >
            <Clock className="w-4 h-4" />
            Pendientes ({impactedSocios.length})
          </button>
          <button
            onClick={() => setView('history')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              view === 'history' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"
            )}
          >
            <History className="w-4 h-4" />
            Historial
          </button>
        </div>
      </div>

      {!config && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-6 flex items-center gap-4">
          <AlertTriangle className="w-6 h-6 text-orange-500 shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-orange-500">Configuración Requerida</h4>
            <p className="text-sm text-orange-500/80">La API de WhatsApp no está conectada. El envío automático está deshabilitado.</p>
          </div>
          <button className="text-xs font-black uppercase text-orange-500 hover:underline">Configurar</button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
            <p className="text-gray-500 font-medium">Sincronizando socios y logs...</p>
          </motion.div>
        ) : view === 'pending' ? (
          <motion.div
            key="pending-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="space-y-4"
          >
            {impactedSocios.length === 0 ? (
              <div className="bg-[#111] border border-white/10 rounded-3xl p-16 text-center">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">¡Todo al día!</h3>
                <p className="text-gray-500 max-w-sm mx-auto">No hay socios con membresías vencidas o por vencer en los próximos 7 días.</p>
              </div>
            ) : (
              <div className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/5">
                        <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-gray-400">Socio</th>
                        <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-gray-400">Vencimiento</th>
                        <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-gray-400">Estado Contacto</th>
                        <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-gray-400 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {impactedSocios.map((socio) => (
                        <tr key={socio.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center font-bold text-green-500">
                                {socio.nombre[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-white">{socio.nombre}</p>
                                <p className="text-xs text-gray-500 font-mono italic">{socio.telefono || 'Sin teléfono'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-600" />
                              <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold",
                                socio.daysRemaining < 0 ? "bg-red-500/10 text-red-500" : 
                                socio.daysRemaining === 0 ? "bg-orange-500/10 text-orange-500" :
                                "bg-blue-500/10 text-blue-500"
                              )}>
                                {socio.daysRemaining < 0 
                                  ? `Vencido hace ${Math.abs(socio.daysRemaining)} días` 
                                  : socio.daysRemaining === 0 
                                    ? 'Vence HOY' 
                                    : `Vence en ${socio.daysRemaining} días`}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            {socio.lastLog ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  {socio.lastLog.status === 'sent' ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                  )}
                                  <span className="text-xs font-bold text-gray-300">
                                    Enviado ({socio.lastLog.send_mode === 'auto' ? 'Auto' : 'Manual'})
                                  </span>
                                </div>
                                <span className="text-[10px] text-gray-500">
                                  {format(new Date(socio.lastLog.sent_at!), 'dd/MM HH:mm')}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-gray-600 italic text-xs">
                                <Clock className="w-4 h-4" />
                                Sin contacto reciente
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() => handleManualSend(socio)}
                                className="group/btn relative px-4 py-2 bg-white/5 hover:bg-[#25D366] text-gray-400 hover:text-black rounded-xl transition-all border border-white/5 active:scale-95"
                                title="Enviar vía WhatsApp Web"
                              >
                                <ExternalLink className="w-5 h-5" />
                                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-white text-black text-[10px] font-bold rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap">
                                  Manual
                                </span>
                              </button>
                              
                              <button
                                disabled={!config || sendingId === socio.id}
                                onClick={() => handleAutoSend(socio)}
                                className={cn(
                                  "group/btn relative px-6 py-2 rounded-xl transition-all font-bold text-xs flex items-center gap-2 active:scale-95",
                                  config ? "bg-green-500 text-black hover:bg-green-400" : "bg-white/5 text-gray-600"
                                )}
                              >
                                {sendingId === socio.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                                Auto
                                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-white text-black text-[10px] font-bold rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap">
                                  Meta API
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="history-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="bg-[#111] border border-white/10 rounded-3xl p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <History className="w-6 h-6 text-gray-500" />
                Historial de Mensajes
              </h3>
              
              <div className="space-y-4">
                {logs.length === 0 ? (
                  <p className="text-center py-12 text-gray-500 italic">No hay historial de envíos.</p>
                ) : (
                  logs.map((log) => {
                    const socio = socios.find(s => s.id === log.socio_id);
                    return (
                      <div key={log.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            log.status === 'sent' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                          )}>
                            {log.send_mode === 'auto' ? <Send className="w-5 h-5" /> : <ExternalLink className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{socio?.nombre || 'Socio eliminado'}</p>
                            <p className="text-xs text-gray-500 truncate max-w-xs">{log.message_text}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-gray-300">{format(new Date(log.sent_at!), 'dd/MM/yyyy HH:mm')}</p>
                          <p className={cn(
                            "text-[10px] uppercase font-black",
                            log.status === 'sent' ? "text-green-500" : "text-red-500"
                          )}>
                            {log.status === 'sent' ? 'Mensaje Enviado' : 'Error en envío'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20 rounded-3xl p-8">
        <div className="flex items-start gap-6">
          <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
            <Info className="w-8 h-8 text-black" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Información sobre Meta Templates</h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
              WhatsApp requiere el uso de "Plantillas" (Templates) aprobadas para iniciar conversaciones con los socios. 
              Asegúrate de haber configurado tu plantilla <code className="bg-white/10 px-1.5 py-0.5 rounded text-blue-400">recordatorio_vencimiento</code> en el portal de Meta con dos variables: nombre del socio y días restantes. 
              Los recordatorios manuales no requieren aprobación de Meta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
