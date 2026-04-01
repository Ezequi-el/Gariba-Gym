import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { LogIn, Dumbbell, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export default function Login({ onSwitchToSocio }: { onSwitchToSocio: () => void }) {
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      console.error("Login error:", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#111] border border-white/10 p-8 rounded-2xl shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mb-4 border border-orange-500/30">
            <Dumbbell className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Gariba Gym</h1>
          <p className="text-gray-400 text-center">Panel Administrativo</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleLogin}
            className="w-full bg-white text-black font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all active:scale-[0.98] group"
          >
            <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            Iniciar Sesión con Google
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#111] px-2 text-gray-500 font-bold tracking-widest">O si eres socio</span>
            </div>
          </div>

          <button
            onClick={onSwitchToSocio}
            className="w-full bg-lime-500/10 border border-lime-500/20 text-lime-500 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-lime-500/20 transition-all active:scale-[0.98]"
          >
            Acceso para Socios
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-8 text-center text-[10px] text-gray-600 uppercase tracking-widest">
          Acceso Restringido a Personal Autorizado
        </p>
      </motion.div>
    </div>
  );
}
