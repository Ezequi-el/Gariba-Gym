import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, Timestamp, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
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
  AlertTriangle
} from 'lucide-react';
import { format, addDays, isAfter } from 'date-fns';
import { toast } from 'sonner';

interface Sucursal {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  fechaCreacion: Timestamp;
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

  useEffect(() => {
    const q = query(collection(db, 'sucursales'), orderBy('fechaCreacion', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sucursal[];
      setSucursales(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sucursales');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddSucursal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSucursal.nombre || !newSucursal.direccion || !newSucursal.telefono) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    try {
      await addDoc(collection(db, 'sucursales'), {
        ...newSucursal,
        fechaCreacion: Timestamp.now()
      });
      toast.success("Sucursal agregada correctamente");
      setIsModalOpen(false);
      setNewSucursal({ nombre: '', direccion: '', telefono: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sucursales');
      toast.error("Error al agregar sucursal");
    }
  };

  const handleDeleteSucursal = async () => {
    if (!sucursalToDelete) return;

    try {
      await deleteDoc(doc(db, 'sucursales', sucursalToDelete.id));
      toast.success("Sucursal eliminada correctamente");
      setSucursalToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sucursales/${sucursalToDelete.id}`);
      toast.error("Error al eliminar sucursal");
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
          {canManage && (
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
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-500 text-sm">Cargando sucursales...</span>
                    </div>
                  </td>
                </tr>
              ) : sucursales.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 text-sm italic">
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
                        {format(sucursal.fechaCreacion.toDate(), 'dd/MM/yyyy')}
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
