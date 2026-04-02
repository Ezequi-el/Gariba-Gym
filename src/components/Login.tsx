import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { LogIn, Dumbbell, ArrowRight, Mail, Lock } from 'lucide-react';
import { useState } from 'react';

export default function Login({ onSwitchToSocio }: { onSwitchToSocio: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : err.message);
      console.error("Login error:", err);
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Gariba Gym</h1>
          <p className="text-gray-400 text-center text-sm">Panel Administrativo</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-medium flex items-center gap-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-1">Correo Electrónico</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-orange-500 transition-colors" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@garibagym.com"
                className="w-full bg-black border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white focus:border-orange-500 outline-none transition-all placeholder:text-gray-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-1">Contraseña</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-orange-500 transition-colors" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white focus:border-orange-500 outline-none transition-all placeholder:text-gray-700"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-black uppercase tracking-tighter py-4 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-orange-500 transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Acceder al Panel
              </>
            )}
          </button>
        </form>

        <div className="relative py-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-[#111] px-4 text-gray-600 font-black tracking-[0.2em]">O si eres socio</span>
          </div>
        </div>

        <button
          onClick={onSwitchToSocio}
          className="w-full bg-lime-500/5 border border-lime-500/10 text-lime-500 font-black uppercase tracking-tighter py-4 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-lime-500/10 transition-all active:scale-[0.98]"
        >
          Portal de Entrenamiento
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="mt-8 text-center text-[9px] text-gray-700 uppercase font-bold tracking-[0.3em]">
          Gariba Gym &bull; Security Protocol V3.0
        </p>
      </motion.div>
    </div>
  );
}
