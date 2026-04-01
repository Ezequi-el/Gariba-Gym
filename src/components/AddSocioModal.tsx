import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  Timestamp, 
  query, 
  where, 
  getDocs, 
  limit 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion } from 'motion/react';
import { X, UserPlus, Calendar, Mail, CheckCircle2, Phone, Lock as LockIcon } from 'lucide-react';
import { addMonths, addYears, format } from 'date-fns';

interface AddSocioModalProps {
  onClose: () => void;
  user: User;
  sucursalId: string;
}

export default function AddSocioModal({ onClose, user, sucursalId }: AddSocioModalProps) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState(format(new Date(), 'yyyyMMdd'));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !email) return;

    setLoading(true);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if email already exists
      const q = query(collection(db, 'socios'), where('email', '==', normalizedEmail), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        alert("Ya existe un socio registrado con este correo electrónico.");
        setLoading(false);
        return;
      }

      const fechaInicio = new Date();
      // Default to 1 day expiration if no plan is selected, or just set to today
      // Usually, they will pay later to activate.
      const fechaVencimiento = fechaInicio; 

      await addDoc(collection(db, 'socios'), {
        nombre,
        email: normalizedEmail,
        telefono,
        password,
        mustChangePassword: true,
        fechaInicio: Timestamp.fromDate(fechaInicio),
        fechaVencimiento: Timestamp.fromDate(fechaVencimiento),
        estado: 'Vencida', // Start as expired until they pay
        uid: user.uid,
        sucursalId,
        createdAt: Timestamp.now()
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'socios');
      alert("Error al agregar socio. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg border border-orange-500/30">
              <UserPlus className="w-5 h-5 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold">Nuevo Socio</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {success ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 border border-green-500/30">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">¡Socio Agregado!</h3>
              <p className="text-gray-400">El registro se ha guardado correctamente.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Nombre Completo</label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      required
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej. Juan Pérez"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Teléfono (WhatsApp)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      required
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Ej. 521234567890"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Contraseña Temporal</label>
                  <div className="relative">
                    <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      required
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Contraseña"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 italic">Por defecto es la fecha de hoy (AAAAMMDD). El socio deberá cambiarla al entrar.</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-semibold"
                >
                  Cancelar
                </button>
                <button
                  disabled={loading}
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-bold py-3 px-6 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Registrar Socio
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </motion.div>
    </div>
  );
}
