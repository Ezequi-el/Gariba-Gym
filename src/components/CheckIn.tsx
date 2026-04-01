import React, { useState, useRef, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserCheck, 
  UserX, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  XCircle,
  Dumbbell
} from 'lucide-react';
import { cn } from '../lib/utils';

type Status = 'idle' | 'loading' | 'success' | 'denied';

export default function CheckIn({ sucursalId }: { sucursalId: string }) {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [socioName, setSocioName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'idle') {
      inputRef.current?.focus();
    }
  }, [status]);

  const handleCheckIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || status === 'loading') return;

    setStatus('loading');
    try {
      const searchInput = input.trim();
      const sociosRef = collection(db, 'socios');
      
      // 1. First, check if this email/name is BANNED in ANY sucursal (Global Ban)
      const qGlobalEmail = query(sociosRef, where('email', '==', searchInput.toLowerCase()));
      const globalEmailSnap = await getDocs(qGlobalEmail);
      
      let globalBanned = globalEmailSnap.docs.find(d => d.data().estado === 'Baneado');
      
      if (!globalBanned) {
        const qGlobalName = query(sociosRef, where('nombre', '==', searchInput));
        const globalNameSnap = await getDocs(qGlobalName);
        globalBanned = globalNameSnap.docs.find(d => d.data().estado === 'Baneado');
      }

      if (globalBanned) {
        setSocioName(globalBanned.data().nombre);
        setStatus('denied');
        return;
      }

      // 2. If not globally banned, check for active membership in CURRENT sucursal
      const qEmail = query(
        sociosRef, 
        where('sucursalId', '==', sucursalId),
        where('email', '==', searchInput.toLowerCase())
      );
      let snapshot = await getDocs(qEmail);

      if (snapshot.empty) {
        const qNombre = query(
          sociosRef, 
          where('sucursalId', '==', sucursalId),
          where('nombre', '==', searchInput)
        );
        snapshot = await getDocs(qNombre);
      }

      if (snapshot.empty) {
        setStatus('denied');
      } else {
        const activeSocio = snapshot.docs.find(d => d.data().estado === 'Activa');
        
        if (activeSocio) {
          const socioData = activeSocio.data();
          setSocioName(socioData.nombre);
          
          // Record attendance for the branch
          await addDoc(collection(db, 'asistencias'), {
            socioId: activeSocio.id,
            nombre: socioData.nombre,
            fecha: Timestamp.now(),
            sucursalId
          });
          
          setStatus('success');
        } else {
          // If found but not active (and we already checked for bans)
          const firstSocio = snapshot.docs[0].data();
          setSocioName(firstSocio.nombre);
          setStatus('denied');
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'asistencias');
      setStatus('denied');
    }

    // Reset after 4 seconds
    setTimeout(() => {
      setStatus('idle');
      setInput('');
      setSocioName('');
    }, 4000);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {status === 'idle' || status === 'loading' ? (
          <motion.div
            key="input-view"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="w-full text-center space-y-12"
          >
            <div className="space-y-4">
              <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center mx-auto border border-orange-500/20">
                <Dumbbell className="w-10 h-10 text-orange-500" />
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Control de Acceso</h2>
              <p className="text-gray-500 text-lg">Ingrese su nombre o correo electrónico</p>
            </div>

            <form onSubmit={handleCheckIn} className="relative w-full max-w-2xl mx-auto group">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={status === 'loading'}
                placeholder="Nombre o Email..."
                className="w-full bg-[#111] border-2 border-white/10 rounded-2xl md:rounded-3xl py-6 md:py-8 px-6 md:px-10 text-xl md:text-3xl font-bold text-center focus:outline-none focus:border-orange-500 transition-all placeholder:text-gray-800"
              />
              <button
                type="submit"
                disabled={!input.trim() || status === 'loading'}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 bg-orange-500 rounded-xl md:rounded-2xl flex items-center justify-center text-black hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-0 disabled:scale-90"
              >
                {status === 'loading' ? (
                  <div className="w-5 h-5 md:w-6 md:h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-6 h-6 md:w-8 md:h-8" />
                )}
              </button>
            </form>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Membresía Activa</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Membresía Vencida</span>
              </div>
            </div>
          </motion.div>
        ) : status === 'success' ? (
          <motion.div
            key="success-view"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full min-h-[400px] bg-green-950/30 border-4 border-green-500 rounded-[30px] md:rounded-[40px] flex flex-col items-center justify-center p-6 md:p-12 text-center shadow-[0_0_100px_rgba(34,197,94,0.1)]"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-24 h-24 md:w-32 md:h-32 bg-green-500 rounded-full flex items-center justify-center mb-6 md:mb-8 shadow-lg shadow-green-500/40"
            >
              <UserCheck className="w-12 h-12 md:w-16 md:h-16 text-black" />
            </motion.div>
            <h3 className="text-3xl md:text-6xl font-black text-green-400 uppercase tracking-tighter mb-4">ACCESO CONCEDIDO</h3>
            <p className="text-lg md:text-2xl text-green-200/60 font-medium mb-2">¡Bienvenido de nuevo, {socioName}!</p>
            <p className="text-2xl md:text-4xl font-bold text-white uppercase tracking-widest">¡A ENTRENAR!</p>
          </motion.div>
        ) : (
          <motion.div
            key="denied-view"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full min-h-[400px] bg-red-950/30 border-4 border-red-500 rounded-[30px] md:rounded-[40px] flex flex-col items-center justify-center p-6 md:p-12 text-center shadow-[0_0_100px_rgba(239,68,68,0.1)]"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-24 h-24 md:w-32 md:h-32 bg-red-500 rounded-full flex items-center justify-center mb-6 md:mb-8 shadow-lg shadow-red-500/40"
            >
              <UserX className="w-12 h-12 md:w-16 md:h-16 text-black" />
            </motion.div>
            <h3 className="text-3xl md:text-6xl font-black text-red-400 uppercase tracking-tighter mb-4">ACCESO DENEGADO</h3>
            <p className="text-lg md:text-2xl text-red-200/60 font-medium mb-2">
              {socioName ? `${socioName} está BANEADO` : 'Socio no encontrado o membresía vencida'}
            </p>
            <p className="text-2xl md:text-4xl font-bold text-white uppercase tracking-widest">PASE A RECEPCIÓN</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
