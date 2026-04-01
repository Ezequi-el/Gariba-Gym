import React, { useState } from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion } from 'motion/react';
import { Socio } from '../types';
import { 
  X, 
  AlertTriangle, 
  MinusCircle, 
  Ban, 
  CheckCircle2,
  Calendar,
  ShieldAlert
} from 'lucide-react';
import { format, subDays, addDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface PenalizeSocioModalProps {
  socio: Socio;
  onClose: () => void;
}

export default function PenalizeSocioModal({ socio, onClose }: PenalizeSocioModalProps) {
  const [loading, setLoading] = useState(false);
  const [daysToSubtract, setDaysToSubtract] = useState(1);
  const [action, setAction] = useState<'subtract' | 'ban'>('subtract');

  const handleSubtractDays = async () => {
    if (daysToSubtract <= 0) return;
    setLoading(true);
    try {
      const currentVencimiento = socio.fechaVencimiento.toDate();
      const newVencimiento = subDays(currentVencimiento, daysToSubtract);
      
      await updateDoc(doc(db, 'socios', socio.id), {
        fechaVencimiento: Timestamp.fromDate(newVencimiento)
      });
      
      toast.success(`Se han restado ${daysToSubtract} días a la membresía de ${socio.nombre}`);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `socios/${socio.id}`);
      toast.error("Error al restar días");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBan = async () => {
    setLoading(true);
    try {
      const newEstado = socio.estado === 'Baneado' ? 'Activa' : 'Baneado';
      await updateDoc(doc(db, 'socios', socio.id), {
        estado: newEstado
      });
      
      toast.success(newEstado === 'Baneado' ? `${socio.nombre} ha sido baneado` : `${socio.nombre} ha sido reactivado`);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `socios/${socio.id}`);
      toast.error("Error al cambiar estado de baneo");
    } finally {
      setLoading(false);
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
        className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Penalizar Socio</h3>
              <p className="text-gray-500 text-xs">{socio.nombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex gap-2 mb-8 p-1 bg-white/5 rounded-2xl border border-white/5">
          <button
            onClick={() => setAction('subtract')}
            className={cn(
              "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
              action === 'subtract' ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
            )}
          >
            Quitar Días
          </button>
          <button
            onClick={() => setAction('ban')}
            className={cn(
              "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
              action === 'ban' ? "bg-red-500/10 text-red-500" : "text-gray-500 hover:text-gray-300"
            )}
          >
            {socio.estado === 'Baneado' ? 'Quitar Baneo' : 'Banear'}
          </button>
        </div>

        {action === 'subtract' ? (
          <div className="space-y-6">
            <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-200/60 leading-relaxed">
                Esta acción restará días a la fecha de vencimiento actual. 
                Vencimiento actual: <span className="text-white font-bold">{format(socio.fechaVencimiento.toDate(), 'dd/MM/yyyy')}</span>
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Días a restar</label>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setDaysToSubtract(Math.max(1, daysToSubtract - 1))}
                  className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                >
                  -
                </button>
                <div className="flex-1 bg-black border border-white/10 rounded-xl py-3 px-4 text-center text-xl font-bold text-white">
                  {daysToSubtract}
                </div>
                <button 
                  onClick={() => setDaysToSubtract(daysToSubtract + 1)}
                  className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={handleSubtractDays}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <MinusCircle className="w-5 h-5" />
                  Confirmar Penalización
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className={cn(
              "border rounded-2xl p-4 flex items-start gap-3",
              socio.estado === 'Baneado' ? "bg-green-500/5 border-green-500/10" : "bg-red-500/5 border-red-500/10"
            )}>
              <AlertTriangle className={cn(
                "w-5 h-5 shrink-0 mt-0.5",
                socio.estado === 'Baneado' ? "text-green-500" : "text-red-500"
              )} />
              <p className={cn(
                "text-xs leading-relaxed",
                socio.estado === 'Baneado' ? "text-green-200/60" : "text-red-200/60"
              )}>
                {socio.estado === 'Baneado' 
                  ? "Esta acción permitirá que el socio vuelva a ingresar al gimnasio normalmente."
                  : "El socio no podrá realizar check-in ni acceder a las instalaciones hasta que se levante el baneo."}
              </p>
            </div>

            <button
              onClick={handleToggleBan}
              disabled={loading}
              className={cn(
                "w-full font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2",
                socio.estado === 'Baneado' 
                  ? "bg-green-500 hover:bg-green-600 text-black shadow-green-500/20" 
                  : "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
              )}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {socio.estado === 'Baneado' ? <CheckCircle2 className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                  {socio.estado === 'Baneado' ? 'Reactivar Socio' : 'Confirmar Baneo'}
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
