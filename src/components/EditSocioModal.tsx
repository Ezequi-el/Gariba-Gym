import React, { useState } from 'react';
import { 
  doc, 
  updateDoc, 
  Timestamp, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Socio, Sucursal } from '../types';
import { X, CheckCircle2, User, Mail, Phone, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface EditSocioModalProps {
  socio: Socio;
  sucursales: Sucursal[];
  onClose: () => void;
}

export default function EditSocioModal({ socio, sucursales, onClose }: EditSocioModalProps) {
  const [formData, setFormData] = useState({
    nombre: socio.nombre,
    email: socio.email || '',
    telefono: socio.telefono || '',
    sucursalId: socio.sucursalId || sucursales[0]?.id || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setIsSaving(true);
    try {
      const normalizedEmail = formData.email.toLowerCase().trim();
      
      // Check if email already exists for ANOTHER socio
      if (normalizedEmail) {
        const q = query(
          collection(db, 'socios'), 
          where('email', '==', normalizedEmail),
          limit(5) // Get a few to check IDs
        );
        const snapshot = await getDocs(q);
        const otherSocio = snapshot.docs.find(d => d.id !== socio.id);
        
        if (otherSocio) {
          toast.error('Ya existe otro socio con este correo electrónico.');
          setIsSaving(false);
          return;
        }
      }

      const socioRef = doc(db, 'socios', socio.id);
      await updateDoc(socioRef, {
        ...formData,
        email: formData.email.toLowerCase().trim()
      });
      toast.success('Datos actualizados correctamente');
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `socios/${socio.id}`);
      toast.error('Error al actualizar los datos');
    } finally {
      setIsSaving(false);
    }
  };

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
        className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white">Editar Socio</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                <input
                  required
                  type="text"
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-5 focus:outline-none focus:border-orange-500 transition-all text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-5 focus:outline-none focus:border-orange-500 transition-all text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={e => setFormData({...formData, telefono: e.target.value})}
                  className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-5 focus:outline-none focus:border-orange-500 transition-all text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sucursal Asignada</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                <select
                  value={formData.sucursalId}
                  onChange={e => setFormData({...formData, sucursalId: e.target.value})}
                  className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-5 focus:outline-none focus:border-orange-500 transition-all text-white appearance-none"
                >
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Guardar Cambios
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
