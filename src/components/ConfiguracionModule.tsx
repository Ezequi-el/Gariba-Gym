import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { handleSupabaseError, OperationType } from '../lib/supabaseHelpers';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  Building2, 
  Plus, 
  MapPin, 
  Phone, 
  Calendar,
  Search,
  CheckCircle2,
  X,
  Trash2,
  AlertTriangle,
  MessageSquare,
  Key
} from 'lucide-react';
import { WhatsAppConfig } from '../lib/whatsapp';
import { format, addDays, isAfter } from 'date-fns';
import { toast } from 'sonner';

interface Sucursal {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  fecha_creacion: string;
}

export default function ConfiguracionModule({ canManage = true }: { canManage?: boolean }) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sucursalToDelete, setSucursalToDelete] = useState<Sucursal | null>(null);
  const [newSucursal, setNewSucursal] = useState({
    nombre: '',
    direccion: '',
    telefono: ''
  });
  const [activeTab, setActiveTab] = useState<'sucursales' | 'whatsapp'>('sucursales');
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig>({
    sucursal_id: '',
    phone_number_id: '',
    waba_id: '',
    access_token: '',
    system_phone: ''
  });
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: sData, error: sError } = await supabase
        .from('sucursales')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      if (sError) {
        handleSupabaseError(sError, OperationType.READ, 'sucursales');
      } else {
        setSucursales(sData || []);
        if (sData && sData.length > 0) {
          // Fetch existing WhatsApp config for the first sucursal
          const { data: wData } = await supabase
            .from('whatsapp_config')
            .select('*')
            .eq('sucursal_id', sData[0].id)
            .single();
          
          if (wData) {
            setWhatsappConfig(wData);
          } else {
            setWhatsappConfig(prev => ({ ...prev, sucursal_id: sData[0].id }));
          }
        }
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleAddSucursal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSucursal.nombre || !newSucursal.direccion || !newSucursal.telefono) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    try {
      const { error } = await supabase.from('sucursales').insert({
        ...newSucursal,
        fecha_creacion: new Date().toISOString()
      });
      if (error) throw error;
      toast.success("Sucursal agregada correctamente");
      setIsModalOpen(false);
      setNewSucursal({ nombre: '', direccion: '', telefono: '' });
      
      // Refresh data
      const { data } = await supabase.from('sucursales').select('*').order('fecha_creacion', { ascending: false });
      setSucursales(data || []);
    } catch (error) {
      handleSupabaseError(error, OperationType.CREATE, 'sucursales');
      toast.error("Error al agregar sucursal");
    }
  };

  const handleDeleteSucursal = async () => {
    if (!sucursalToDelete) return;

    try {
      const { error } = await supabase.from('sucursales').delete().eq('id', sucursalToDelete.id);
      if (error) throw error;
      toast.success("Sucursal eliminada correctamente");
      setSucursalToDelete(null);
      setSucursales(prev => prev.filter(s => s.id !== sucursalToDelete.id));
    } catch (error) {
      handleSupabaseError(error, OperationType.DELETE, `sucursales/${sucursalToDelete.id}`);
      toast.error("Error al eliminar sucursal");
    }
  };

  const handleSaveWhatsAppConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappConfig.phone_number_id || !whatsappConfig.waba_id || !whatsappConfig.access_token) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    setSavingConfig(true);
    try {
      const { error } = await supabase
        .from('whatsapp_config')
        .upsert(whatsappConfig, { onConflict: 'sucursal_id' });

      if (error) throw error;
      toast.success("Configuración de WhatsApp guardada");
    } catch (error) {
      handleSupabaseError(error, OperationType.UPDATE, 'whatsapp_config');
      toast.error("Error al guardar configuración");
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Building2 className="w-8 h-8 text-orange-500" />
            Configuración de Sucursales
          </h2>
          <p className="text-gray-500 mt-1">Gestión de sedes y puntos de atención</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mr-4">
            <button
              onClick={() => setActiveTab('sucursales')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                activeTab === 'sucursales' ? "bg-orange-500 text-black" : "text-gray-500 hover:text-white"
              )}
            >
              Sucursales
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                activeTab === 'whatsapp' ? "bg-green-500 text-black" : "text-gray-500 hover:text-white"
              )}
            >
              WhatsApp API
            </button>
          </div>

          {activeTab === 'sucursales' && canManage && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-black font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-5 h-5" />
              Agregar Sucursal
            </button>
          )}
        </div>
      </div>

      {activeTab === 'sucursales' ? (
        <div className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-bottom border-white/5 bg-white/5">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Nombre</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Dirección</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Teléfono</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Fecha Registro</th>
                  {canManage && <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-500 text-sm">Cargando sucursales...</span>
                      </div>
                    </td>
                  </tr>
                ) : sucursales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm italic">
                      No hay sucursales registradas. Agrega la primera sucursal para comenzar.
                    </td>
                  </tr>
                ) : (
                  sucursales.map((sucursal) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={sucursal.id} 
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-orange-500" />
                          </div>
                          <span className="font-medium text-gray-200">{sucursal.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <MapPin className="w-4 h-4 text-gray-600" />
                          {sucursal.direccion}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Phone className="w-4 h-4 text-gray-600" />
                          {sucursal.telefono}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4 text-gray-600" />
                          {format(new Date(sucursal.fecha_creacion), 'dd/MM/yyyy')}
                        </div>
                      </td>
                      {canManage && (
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSucursalToDelete(sucursal)}
                            className="p-2 hover:bg-white/5 text-gray-500 hover:text-red-400 transition-colors rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-start gap-6 mb-8 bg-green-500/5 p-6 rounded-2xl border border-green-500/10">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Configuración Meta API</h3>
              <p className="text-gray-400 text-sm">Conecta tu cuenta de WhatsApp Business para activar el envío automático de recordatorios.</p>
            </div>
          </div>

          <form onSubmit={handleSaveWhatsAppConfig} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Key className="w-3 h-3 text-green-500" /> Token de Acceso Permanente
              </label>
              <input
                type="password"
                placeholder="EAA..."
                value={whatsappConfig.access_token}
                onChange={e => setWhatsappConfig({...whatsappConfig, access_token: e.target.value})}
                className="w-full bg-black border border-white/10 rounded-2xl py-4 px-5 focus:outline-none focus:border-green-500 transition-all text-white font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Phone Number ID</label>
              <input
                type="text"
                placeholder="109..."
                value={whatsappConfig.phone_number_id}
                onChange={e => setWhatsappConfig({...whatsappConfig, phone_number_id: e.target.value})}
                className="w-full bg-black border border-white/10 rounded-2xl py-4 px-5 focus:outline-none focus:border-green-500 transition-all text-white font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">WhatsApp Business Account ID</label>
              <input
                type="text"
                placeholder="102..."
                value={whatsappConfig.waba_id}
                onChange={e => setWhatsappConfig({...whatsappConfig, waba_id: e.target.value})}
                className="w-full bg-black border border-white/10 rounded-2xl py-4 px-5 focus:outline-none focus:border-green-500 transition-all text-white font-mono text-sm"
              />
            </div>

            <div className="pt-4 col-span-2">
              <button
                type="submit"
                disabled={savingConfig}
                className="w-full md:w-auto bg-green-500 hover:bg-green-600 disabled:opacity-50 text-black font-bold py-4 px-12 rounded-2xl transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-3"
              >
                {savingConfig ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Guardar Configuración
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-white">Nueva Sucursal</h3>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <form onSubmit={handleAddSucursal} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nombre de la Sucursal</label>
                    <input
                      required
                      type="text"
                      placeholder="Ej. Gariba Gym Norte"
                      value={newSucursal.nombre}
                      onChange={e => setNewSucursal({...newSucursal, nombre: e.target.value})}
                      className="w-full bg-black border border-white/10 rounded-2xl py-4 px-5 focus:outline-none focus:border-orange-500 transition-all text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Dirección</label>
                    <input
                      required
                      type="text"
                      placeholder="Calle 123 #45-67"
                      value={newSucursal.direccion}
                      onChange={e => setNewSucursal({...newSucursal, direccion: e.target.value})}
                      className="w-full bg-black border border-white/10 rounded-2xl py-4 px-5 focus:outline-none focus:border-orange-500 transition-all text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Teléfono de Contacto</label>
                    <input
                      required
                      type="tel"
                      placeholder="+54 9 123 4567"
                      value={newSucursal.telefono}
                      onChange={e => setNewSucursal({...newSucursal, telefono: e.target.value})}
                      className="w-full bg-black border border-white/10 rounded-2xl py-4 px-5 focus:outline-none focus:border-orange-500 transition-all text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Guardar Sucursal
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sucursalToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSucursalToDelete(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">¿Eliminar Sucursal?</h3>
                <p className="text-gray-400 text-sm mb-8">
                  Estás a punto de eliminar la sucursal <span className="text-white font-bold">{sucursalToDelete.nombre}</span>. Esta acción no se puede deshacer.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSucursalToDelete(null)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteSucursal}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-red-500/20"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
