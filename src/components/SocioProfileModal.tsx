import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { handleSupabaseError, OperationType } from '../lib/supabaseHelpers';
import { motion, AnimatePresence } from 'motion/react';
import { Socio } from '../types';
import { 
  X, 
  User, 
  Calendar, 
  Clock, 
  History, 
  MapPin, 
  Phone, 
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShoppingBag,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface Asistencia {
  id: string;
  fecha: string;
  sucursalId: string;
}

interface Venta {
  id: string;
  fecha: string;
  total: number;
  items: any[];
  metodoPago: string;
}

interface SocioProfileModalProps {
  socio: Socio;
  onClose: () => void;
}

export default function SocioProfileModal({ socio, onClose }: SocioProfileModalProps) {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'asistencias' | 'compras'>('asistencias');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Asistencias
        const { data: dataAsistencias, error: errorAsistencias } = await supabase
          .from('asistencias')
          .select('*')
          .eq('socio_id', socio.id)
          .order('fecha', { ascending: false })
          .limit(20);
        
        if (errorAsistencias) throw errorAsistencias;
        setAsistencias(dataAsistencias || []);

        // Fetch Ventas
        const { data: dataVentas, error: errorVentas } = await supabase
          .from('ventas')
          .select('*')
          .eq('socio_id', socio.id)
          .order('fecha', { ascending: false })
          .limit(20);
        
        if (errorVentas) throw errorVentas;
        setVentas(dataVentas || []);

      } catch (error) {
        handleSupabaseError(error, OperationType.READ, 'socio_profile_data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [socio.id]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="flex flex-col h-[80vh] md:h-auto max-h-[90vh]">
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-orange-500/5 to-transparent">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <User className="w-8 h-8 text-orange-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{socio.nombre}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                    socio.estado === 'Activa' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                    socio.estado === 'Baneado' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                    "bg-orange-500/10 text-orange-400 border-orange-500/20"
                  )}>
                    {socio.estado}
                  </span>
                  <span className="text-gray-500 text-xs font-medium">ID: {socio.id.slice(0, 8)}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-3xl p-5 border border-white/5 space-y-4">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Información de Contacto</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <Mail className="w-4 h-4 text-orange-500/50" />
                    {socio.email || 'No registrado'}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <Phone className="w-4 h-4 text-orange-500/50" />
                    {socio.telefono || 'No registrado'}
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-3xl p-5 border border-white/5 space-y-4">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Membresía</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <Calendar className="w-4 h-4 text-orange-500/50" />
                    Inicio: {socio.fecha_inicio ? format(new Date(socio.fecha_inicio), 'dd/MM/yyyy') : 'N/A'}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <Clock className="w-4 h-4 text-orange-500/50" />
                    Vence: {socio.fecha_vencimiento ? format(new Date(socio.fecha_vencimiento), 'dd/MM/yyyy') : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* History Tabs */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 border-b border-white/5 pb-2">
                <button
                  onClick={() => setActiveTab('asistencias')}
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 pb-2 transition-all relative",
                    activeTab === 'asistencias' ? "text-orange-500" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <History className="w-3 h-3" />
                  Asistencias
                  {activeTab === 'asistencias' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />}
                </button>
                <button
                  onClick={() => setActiveTab('compras')}
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 pb-2 transition-all relative",
                    activeTab === 'compras' ? "text-orange-500" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <ShoppingBag className="w-3 h-3" />
                  Compras
                  {activeTab === 'compras' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />}
                </button>
              </div>

              <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
                {loading ? (
                  <div className="p-12 text-center">
                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <span className="text-gray-500 text-xs">Cargando historial...</span>
                  </div>
                ) : activeTab === 'asistencias' ? (
                  asistencias.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 text-sm italic">
                      No hay registros de asistencia para este socio.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {asistencias.map((asistencia) => (
                        <div key={asistencia.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-200">Asistencia Registrada</p>
                              <p className="text-[10px] text-gray-500">{format(new Date(asistencia.fecha), 'eeee, d MMMM yyyy')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-mono text-gray-400">{format(new Date(asistencia.fecha), 'HH:mm')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  ventas.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 text-sm italic">
                      No hay registros de compras para este socio.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {ventas.map((venta) => (
                        <div key={venta.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                              <DollarSign className="w-4 h-4 text-orange-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-200">
                                {venta.items?.map(i => i.nombre).join(', ') || 'Venta'}
                              </p>
                              <p className="text-[10px] text-gray-500">{format(new Date(venta.fecha), 'd MMMM yyyy, HH:mm')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-mono font-bold text-orange-500">${venta.total}</p>
                            <p className="text-[10px] text-gray-600">{venta.metodoPago}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
