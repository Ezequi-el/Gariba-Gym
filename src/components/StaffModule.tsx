import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { handleSupabaseError, OperationType } from '../lib/supabaseHelpers';
import { 
  Users, 
  UserPlus, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Mail, 
  UserCircle,
  X,
  CheckCircle2,
  Trash2,
  Lock as LockIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface UserProfile {
  id?: string;
  email: string;
  nombre?: string;
  fechaNacimiento?: string;
  telefono?: string;
  role: 'owner' | 'manager' | 'receptionist' | 'trainer';
  sucursalId?: string;
}

export default function StaffModule() {
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resetPasswordModal, setResetPasswordModal] = useState<{id: string, email: string} | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [newUser, setNewUser] = useState({
    nombre: '',
    email: '',
    fechaNacimiento: '',
    telefono: '',
    role: 'receptionist' as const
  });

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const staffId = newUser.email.replace(/\./g, '_');
      const { error } = await supabase.from('user_profiles').insert({
        ...newUser,
        id: staffId, // Placeholder until they log in
        invited: true
      });
      if (error) throw error;
      toast.success("Personal agregado correctamente");
      setIsModalOpen(false);
      setNewUser({
        nombre: '',
        email: '',
        fechaNacimiento: '',
        telefono: '',
        role: 'receptionist'
      });
      
      // Refresh staff
      const { data } = await supabase.from('user_profiles').select('*');
      setStaff(data || []);
    } catch (error) {
      handleSupabaseError(error, OperationType.CREATE, 'user_profiles');
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar a este miembro del staff?")) return;
    try {
      const { error } = await supabase.from('user_profiles').delete().eq('id', id);
      if (error) throw error;
      toast.success("Miembro eliminado");
      setStaff(prev => prev.filter(p => (p.id || p.email) !== id));
    } catch (error) {
      handleSupabaseError(error, OperationType.DELETE, `user_profiles/${id}`);
    }
  };

  useEffect(() => {
    const fetchStaff = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*');
      
      if (error) {
        handleSupabaseError(error, OperationType.READ, 'user_profiles');
      } else {
        setStaff(data || []);
      }
      setLoading(false);
    };

    fetchStaff();
  }, []);

  const handleUpdateRole = async (id: string, newRole: any) => {
    try {
      const { error } = await supabase.from('user_profiles').update({ role: newRole }).eq('id', id);
      if (error) throw error;
      toast.success("Rol actualizado correctamente");
      setStaff(prev => prev.map(p => p.id === id ? { ...p, role: newRole } : p));
    } catch (error) {
      toast.error("Error al actualizar rol");
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordModal) return;
    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetPasswordModal.email);
      if (error) throw error;
      toast.success(`Email de restablecimiento enviado a ${resetPasswordModal.email}`);
      setResetPasswordModal(null);
    } catch (error) {
      handleSupabaseError(error, OperationType.UPDATE, `auth/reset/${resetPasswordModal.email}`);
    } finally {
      setIsSendingReset(false);
    }
  };

  const roles = [
    { id: 'owner', label: 'Dueño', icon: <ShieldAlert className="w-4 h-4 text-red-500" /> },
    { id: 'manager', label: 'Gerente', icon: <ShieldCheck className="w-4 h-4 text-orange-500" /> },
    { id: 'receptionist', label: 'Recepcionista', icon: <Shield className="w-4 h-4 text-blue-500" /> },
    { id: 'trainer', label: 'Entrenador', icon: <UserCircle className="w-4 h-4 text-green-500" /> }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-orange-500" />
            Gestión de Staff
          </h2>
          <p className="text-gray-500 mt-1">Administra los roles y permisos de tu equipo</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 text-black font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20"
        >
          <UserPlus className="w-5 h-5" />
          Agregar Personal
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
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
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h3 className="text-xl font-bold text-white">Agregar Personal</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              
              <form onSubmit={handleAddStaff} className="p-8 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nombre Completo</label>
                  <input
                    required
                    type="text"
                    value={newUser.nombre}
                    onChange={(e) => setNewUser({...newUser, nombre: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Correo Electrónico</label>
                  <input
                    required
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Fecha de Nacimiento</label>
                    <input
                      required
                      type="date"
                      value={newUser.fechaNacimiento}
                      onChange={(e) => setNewUser({...newUser, fechaNacimiento: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                    {newUser.fechaNacimiento && (
                      <p className="text-[10px] text-orange-500 font-bold uppercase">Edad: {calculateAge(newUser.fechaNacimiento)} años</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Teléfono</label>
                    <input
                      required
                      type="tel"
                      value={newUser.telefono}
                      onChange={(e) => setNewUser({...newUser, telefono: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                      placeholder="1234567890"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Rol</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id} className="bg-[#111]">{r.label}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-4 rounded-2xl transition-all shadow-lg shadow-orange-500/20 mt-4"
                >
                  Guardar Miembro
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {resetPasswordModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setResetPasswordModal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-8"
            >
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-lime-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <LockIcon className="w-6 h-6 text-lime-500" />
                </div>
                <h3 className="text-lg font-bold text-white">Resetear Contraseña</h3>
                <p className="text-xs text-gray-500 mt-1">Para: {resetPasswordModal.email}</p>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-gray-400 text-center leading-relaxed">
                  Se enviará un enlace de restablecimiento al correo del colaborador. Podrá crear una nueva contraseña desde ese enlace.
                </p>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setResetPasswordModal(null)}
                    className="flex-1 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={isSendingReset}
                    className="flex-1 bg-lime-500 hover:bg-lime-600 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-all shadow-lg shadow-lime-500/20 text-xs"
                  >
                    {isSendingReset ? 'Enviando...' : 'Enviar Email'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-bottom border-white/5 bg-white/5">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Usuario</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Info</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Rol Actual</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : staff.map((member) => (
                <tr key={member.id || member.email} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                        <UserCircle className="w-6 h-6 text-gray-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-200">{member.nombre || member.email}</span>
                        <span className="text-xs text-gray-500">{member.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {member.telefono && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-lime-500" /> {member.telefono}
                        </span>
                      )}
                      {member.fechaNacimiento && (
                        <span className="text-[10px] text-gray-400">
                          {calculateAge(member.fechaNacimiento)} años
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                      member.role === 'owner' ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                      member.role === 'manager' ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" :
                      member.role === 'receptionist' ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                      "bg-green-500/10 text-green-500 border border-green-500/20"
                    )}>
                      {roles.find(r => r.id === member.role)?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex items-center gap-1 mr-4">
                        {roles.map((role) => (
                          <button
                            key={role.id}
                            onClick={() => handleUpdateRole(member.id!, role.id)}
                            disabled={member.role === role.id || !member.id}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              member.role === role.id 
                                ? "bg-white/10 text-white opacity-50 cursor-not-allowed" 
                                : "hover:bg-white/5 text-gray-500 hover:text-white"
                            )}
                            title={role.label}
                          >
                            {role.icon}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setResetPasswordModal({ id: member.id!, email: member.email })}
                        className="p-2 hover:bg-white/10 text-gray-500 hover:text-lime-500 rounded-lg transition-all"
                        title="Resetear Contraseña"
                        disabled={!member.id}
                      >
                        <LockIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(member.id || member.email)}
                        className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-lg transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
