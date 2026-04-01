import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import SocioDashboard from './SocioDashboard';
import { motion, AnimatePresence } from 'motion/react';
import { Dumbbell, ArrowRight, Mail, AlertCircle, Zap, Lock, UserPlus, Phone, User as UserIcon, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

interface Socio {
  id: string;
  nombre: string;
  email: string;
  fecha_vencimiento: string;
  estado: 'Activa' | 'Vencida' | 'Baneado';
  user_id?: string;
}

type AuthView = 'login' | 'register';

export default function SocioApp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authView, setAuthView] = useState<AuthView>('login');
  
  // Registration state
  const [regNombre, setRegNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regTelefono, setRegTelefono] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [socio, setSocio] = useState<Socio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchSocioByUserId(session.user.id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Error checking user:", err);
      setLoading(false);
    }
  };

  const fetchSocioByUserId = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('socios')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (data) {
        if (data.estado === 'Baneado') {
          setError('Tu cuenta ha sido suspendida.');
          await supabase.auth.signOut();
          setSocio(null);
        } else {
          setSocio(data as Socio);
        }
      }
    } catch (err: any) {
      console.error("Error fetching socio:", err);
      setError('Error al acceder a tu perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoggingIn(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password,
      });

      if (authError) throw authError;

      if (data.user) {
        await fetchSocioByUserId(data.user.id);
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNombre || !regEmail || !regPassword) return;

    setIsLoggingIn(true);
    setError(null);

    try {
      const normalizedEmail = regEmail.toLowerCase().trim();
      
      // 1. Sign up in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: regPassword,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create record in socios table
        const { error: dbError } = await supabase
          .from('socios')
          .insert({
            user_id: authData.user.id,
            nombre: regNombre,
            email: normalizedEmail,
            telefono: regTelefono,
            estado: 'Vencida',
            fecha_inicio: new Date().toISOString(),
            fecha_vencimiento: new Date().toISOString(),
            sucursal_id: '00000000-0000-0000-0000-000000000000' // Default or placeholder
          });

        if (dbError) throw dbError;

        toast.success("¡Registro exitoso! Por favor verifica tu correo si es necesario.");
        setAuthView('login');
        setEmail(regEmail);
        setPassword(regPassword);
      }
    } catch (err: any) {
      setError(err.message || 'Error al registrarse.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('socios')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      if (data) {
        setSocio(data as Socio);
      }
    } catch (err: any) {
      setError('Error al cargar socio de prueba.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSocio(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-lime-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AnimatePresence mode="wait">
        {!socio ? (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-6 max-w-md mx-auto"
          >
            <div className="w-20 h-20 bg-lime-500 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-lime-500/20">
              <Dumbbell className="w-10 h-10 text-black" />
            </div>

            <div className="text-center mb-10">
              <h1 className="text-3xl font-black tracking-tight text-white mb-2">Gariba Gym</h1>
              <p className="text-gray-500 text-sm">
                {authView === 'login' ? 'Bienvenido de nuevo, guerrero.' : 'Únete a la familia Gariba.'}
              </p>
            </div>

            {authView === 'login' ? (
              <form onSubmit={handleLogin} className="w-full space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-lime-500/50 transition-colors text-white"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-lime-500/50 transition-colors text-white"
                    required
                  />
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400 leading-relaxed">{error}</p>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-lime-500 hover:bg-lime-600 disabled:opacity-50 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-lime-500/20"
                >
                  {isLoggingIn ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Entrar a mi Perfil
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setAuthView('register')}
                  className="w-full text-gray-500 text-xs font-bold uppercase tracking-widest py-2 hover:text-white transition-colors"
                >
                  ¿No tienes cuenta? Regístrate aquí
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="w-full space-y-4">
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={regNombre}
                    onChange={(e) => setRegNombre(e.target.value)}
                    className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-lime-500/50 transition-colors text-white"
                    required
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    placeholder="tu@correo.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-lime-500/50 transition-colors text-white"
                    required
                  />
                </div>

                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="tel"
                    placeholder="Teléfono (WhatsApp)"
                    value={regTelefono}
                    onChange={(e) => setRegTelefono(e.target.value)}
                    className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-lime-500/50 transition-colors text-white"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    placeholder="Crea tu contraseña"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-lime-500/50 transition-colors text-white"
                    required
                  />
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400 leading-relaxed">{error}</p>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-lime-500 hover:bg-lime-600 disabled:opacity-50 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-lime-500/20"
                >
                  {isLoggingIn ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Crear mi Cuenta
                      <UserPlus className="w-5 h-5" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setAuthView('login')}
                  className="w-full text-gray-500 text-xs font-bold uppercase tracking-widest py-2 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Volver al inicio de sesión
                </button>
              </form>
            )}

            <div className="w-full mt-6">
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-[#0a0a0a] px-2 text-gray-600 font-bold tracking-widest">Para pruebas rápidas</span>
                </div>
              </div>

              <button
                onClick={handleDemoLogin}
                disabled={isLoggingIn}
                className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Zap className="w-4 h-4 text-lime-500" />
                Usar Socio de Prueba
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SocioDashboard socio={socio} onLogout={handleLogout} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
