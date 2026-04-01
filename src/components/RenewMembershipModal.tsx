import React, { useState } from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Socio } from '../types';
import { X, CheckCircle2, Calendar, Clock, Zap } from 'lucide-react';
import { addMonths, addYears, isAfter } from 'date-fns';
import { toast } from 'sonner';

interface RenewMembershipModalProps {
  socio: Socio;
  onClose: () => void;
}

export default function RenewMembershipModal({ socio, onClose }: RenewMembershipModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'1month' | '3months' | '1year'>('1month');

  const handleRenew = async () => {
    setIsSaving(true);
    try {
      const currentExpiry = socio.fechaVencimiento.toDate();
      const baseDate = isAfter(currentExpiry, new Date()) ? currentExpiry : new Date();
      
      let newExpiry: Date;
      if (selectedPlan === '1month') newExpiry = addMonths(baseDate, 1);
      else if (selectedPlan === '3months') newExpiry = addMonths(baseDate, 3);
      else newExpiry = addYears(baseDate, 1);

      const socioRef = doc(db, 'socios', socio.id);
      await updateDoc(socioRef, {
        fechaVencimiento: Timestamp.fromDate(newExpiry),
        estado: 'Activa'
      });
      
      toast.success(`Membresía renovada para ${socio.nombre}`);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `socios/${socio.id}`);
      toast.error('Error al renovar la membresía');
    } finally {
      setIsSaving(false);
    }
  };

  const plans = [
    { id: '1month', label: '1 Mes', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { id: '3months', label: '3 Meses', icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    { id: '1year', label: '1 Año', icon: Calendar, color: 'text-lime-400', bg: 'bg-lime-500/10', border: 'border-lime-500/20' }
  ];

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
            <h3 className="text-xl font-bold text-white">Renovar Membresía</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="mb-8">
            <p className="text-gray-400 text-sm mb-1">Socio:</p>
            <p className="text-lg font-bold text-white">{socio.nombre}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-8">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id as any)}
                className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                  selectedPlan === plan.id 
                    ? `bg-white/10 border-white/20 ring-2 ring-orange-500/50` 
                    : `bg-black border-white/5 hover:border-white/10`
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${plan.bg} flex items-center justify-center`}>
                    <plan.icon className={`w-6 h-6 ${plan.color}`} />
                  </div>
                  <span className="font-bold text-white">{plan.label}</span>
                </div>
                {selectedPlan === plan.id && (
                  <CheckCircle2 className="w-5 h-5 text-orange-500" />
                )}
              </button>
            ))}
          </div>

          <button
            onClick={handleRenew}
            disabled={isSaving}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Confirmar Renovación
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
