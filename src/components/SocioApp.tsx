import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit,
  addDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import SocioDashboard from './SocioDashboard';
import { motion, AnimatePresence } from 'motion/react';
import { Dumbbell, ArrowRight, Mail, AlertCircle, Zap, Lock, UserPlus, Phone, User as UserIcon, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

interface Socio {
  id: string;
  nombre: string;
  email: string;
  fechaVencimiento: any;
  estado: 'Activa' | 'Vencida' | 'Baneado';
  password?: string;
  mustChangePassword?: boolean;
  acceptedTerms?: boolean;
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
    const savedSocioId = localStorage.getItem('gariba_socio_id');
    if (savedSocioId) {
      fetchSocioById(savedSocioId);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchSocioById = async (id: string) => {
    try {
      const q = query(collection(db, 'socios'), where('__name__', '==', id));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        const socioData = { id: snapshot.docs[0].id, ...data } as Socio;
        
        if (socioData.estado === 'Baneado') {
          setError('Tu cuenta ha sido suspendida.');
          localStorage.removeItem('gariba_socio_id');
          setSocio(null);
        } else {
          setSocio(socioData);
        }
      } else {
        localStorage.removeItem('gariba_socio_id');
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, 'socios');
      if (err.code === 'permission-denied') {
        setError('Error de permisos al acceder a tu perfil. Contacta a recepción.');
      }
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
      const q = query(
        collection(db, 'socios'), 
        where('email', '==', email.toLowerCase().trim())
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        const socioData = { id: snapshot.docs[0].id, ...docData } as Socio;

        if (socioData.estado === 'Baneado') {
          setError('Tu cuenta ha sido suspendida. Por favor, acude a recepción para más información.');
          setIsLoggingIn(false);
          return;
        }

        // Check password (simple check for now, should be hashed in production)
        if (socioData.password === password) {
          setSocio(socioData);
          localStorage.setItem('gariba_socio_id', socioData.id);
        } else {
          setError('Contraseña incorrecta. Inténtalo de nuevo.');
        }
      } else {
        setError('No encontramos ningún socio con ese correo. Verifica tus datos o contacta a recepción.');
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, 'socios');
      setError('Ocurrió un error al intentar iniciar sesión. Inténtalo de nuevo.');
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
      
      // Check if email exists
      const q = query(collection(db, 'socios'), where('email', '==', normalizedEmail), limit(1));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setError('Ya existe un socio registrado con este correo electrónico.');
        setIsLoggingIn(false);
        return;
      }

      // Create new socio (default expired/inactive until payment)
      const newSocio = {
        nombre: regNombre,
        email: normalizedEmail,
        telefono: regTelefono,
        password: regPassword,
        estado: 'Vencida', // Start as expired until they pay at reception
        fechaInicio: serverTimestamp(),
        fechaVencimiento: serverTimestamp(), // Expired
        createdAt: serverTimestamp(),
        mustChangePassword: false
      };

      const docRef = await addDoc(collection(db, 'socios'), newSocio);
      
      toast.success("¡Registro exitoso! Ahora puedes iniciar sesión.");
      setAuthView('login');
      setEmail(regEmail);
      setPassword(regPassword);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'socios');
      setError('Error al registrarse. Inténtalo de nuevo.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const q = query(collection(db, 'socios'), limit(5));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const demoDoc = snapshot.docs.find(d => d.data().email) || snapshot.docs[0];
        const data = demoDoc.data();
        const socioData = { id: demoDoc.id, ...data } as Socio;
        setSocio(socioData);
        localStorage.setItem('gariba_socio_id', socioData.id);
      } else {
        setError('No hay socios registrados en la base de datos para probar.');
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, 'socios');
      setError('Error al cargar socio de prueba.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setSocio(null);
    localStorage.removeItem('gariba_socio_id');
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
