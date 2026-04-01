import React, { useState, useEffect, useMemo } from 'react';
import { Socio } from '../types';
import { 
  Dumbbell, 
  Calendar, 
  Zap, 
  Trophy, 
  QrCode, 
  LogOut, 
  ChevronRight,
  Award,
  Clock,
  ShieldAlert,
  ChevronLeft,
  Info,
  CheckCircle2,
  Play,
  RotateCcw,
  CalendarDays,
  User,
  ShoppingBag,
  History,
  CreditCard,
  Package,
  Target,
  Send,
  Plus,
  Edit3,
  XCircle,
  Trash2,
  ShoppingCart,
  Minus,
  BookOpen,
  Lock as LockIcon,
  FileText,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { EXERCISE_CATALOG, ROUTINE_TEMPLATES, getTemplateIcon } from '../constants/gymData';
import { TERMS_AND_CONDITIONS, PRIVACY_POLICY } from '../constants/legal';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { 
  differenceInDays, 
  isAfter, 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  startOfWeek, 
  endOfWeek,
  isToday,
  addMonths,
  subMonths,
  parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface Asistencia {
  id: string;
  fecha: string;
}

interface Exercise {
  ejercicioId: string;
  nombre: string;
  series: string;
  repeticiones: string;
  descanso: string;
  observaciones: string;
  videoUrl?: string;
}

interface DiaRutina {
  nombre: string;
  ejercicios: Exercise[];
}

interface Routine {
  id: string;
  socio_id: string;
  dias: DiaRutina[];
  created_at: string;
}

interface CierreGym {
  id: string;
  fecha: string;
  motivo: string;
}

interface Venta {
  id: string;
  total: number;
  fecha: string;
  metodo_pago: string;
  venta_items: { 
    id: string;
    cantidad: number;
    precio_unitario: number;
    inventario: { nombre: string }
  }[];
}

interface Product {
  id: string;
  nombre: string;
  precio: number;
  tipo: 'producto' | 'servicio';
  categoria?: string;
}

type View = 'home' | 'rutinas' | 'calendario' | 'perfil' | 'tienda';

export default function SocioDashboard({ socio, onLogout }: { socio: Socio, onLogout: () => void }) {
  const [view, setView] = useState<View>('home');
  const [routineAction, setRoutineAction] = useState<'none' | 'request' | 'create_manual' | 'create_guided'>('none');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [showExerciseCatalog, setShowExerciseCatalog] = useState(false);
  const [cart, setCart] = useState<{ id: string, nombre: string, precio: number, cantidad: number }[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy'>('terms');

  useEffect(() => {
    if (socio.must_change_password) {
      setShowPasswordModal(true);
    }
  }, [socio.must_change_password]);

  useEffect(() => {
    if (socio.accepted_terms === false) {
      setShowLegalModal(true);
    }
  }, [socio.accepted_terms]);

  const handleAcceptTerms = async () => {
    try {
      const { error } = await supabase
        .from('socios')
        .update({
          accepted_terms: true
        })
        .eq('id', socio.id);

      if (error) throw error;

      setShowLegalModal(false);
      toast.success('Has aceptado los términos y condiciones');
    } catch (error) {
      console.error("Error accepting terms:", error);
      toast.error('Error al aceptar los términos');
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 4) {
      toast.error("La contraseña debe tener al menos 4 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase
        .from('socios')
        .update({
          password: newPassword,
          must_change_password: false
        })
        .eq('id', socio.id);

      if (error) throw error;

      toast.success("Contraseña actualizada correctamente");
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error("Error updating password:", err);
      toast.error("Error al actualizar la contraseña");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const routineTemplates = ROUTINE_TEMPLATES.map(t => ({
    ...t,
    icon: React.createElement(getTemplateIcon(t.icon))
  }));

  const handleRequestRoutine = async () => {
    try {
      const { error } = await supabase
        .from('solicitudes_rutina')
        .insert({
          socio_id: socio.id,
          nombre_socio: socio.nombre,
          email_socio: socio.email,
          fecha_solicitud: new Date().toISOString(),
          estado: 'Pendiente',
          mensaje: 'El socio ha solicitado una rutina desde la app.',
          sucursal_id: socio.sucursal_id
        });

      if (error) throw error;

      toast.success("Solicitud enviada correctamente");
      setRoutineAction('none');
    } catch (error: any) {
      console.error("Error requesting routine:", error);
      toast.error("Error al enviar la solicitud");
    }
  };

  const handleUpdateRoutine = async () => {
    if (!editingRoutine) return;
    try {
      const { id, ...data } = editingRoutine;
      const { error } = await supabase
        .from('rutinas')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success("Rutina actualizada correctamente");
      setEditingRoutine(null);
    } catch (error: any) {
      console.error("Error updating routine:", error);
      toast.error("Error al actualizar la rutina");
    }
  };

  const handleCreateManualRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('rutinas')
        .insert({
          socio_id: socio.id,
          nombre_socio: socio.nombre,
          dias: [
            { 
              nombre: 'Día 1', 
              ejercicios: [
                { ejercicioId: 'manual', nombre: 'Press de Banca', series: '3', repeticiones: '12', descanso: '60s', observaciones: '', videoUrl: '' }
              ] 
            }
          ],
          created_at: new Date().toISOString(),
          sucursal_id: socio.sucursal_id
        });

      if (error) throw error;

      toast.success("Rutina creada. ¡A entrenar!");
      setRoutineAction('none');
    } catch (error: any) {
      console.error("Error creating manual routine:", error);
      toast.error("Error al crear la rutina");
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    try {
      const template = routineTemplates.find(t => t.id === templateId);
      let dias: DiaRutina[] = [];
      
      if (templateId === 'hipertrofia') {
        dias = [
          {
            nombre: 'Empuje',
            ejercicios: [
              { ejercicioId: 'h1', nombre: 'Press de Banca', series: '4', repeticiones: '10', descanso: '90s', observaciones: '', videoUrl: '' },
              { ejercicioId: 'h2', nombre: 'Press Militar', series: '4', repeticiones: '10', descanso: '90s', observaciones: '', videoUrl: '' }
            ]
          },
          {
            nombre: 'Tracción',
            ejercicios: [
              { ejercicioId: 'h3', nombre: 'Remo con Barra', series: '4', repeticiones: '10', descanso: '90s', observaciones: '', videoUrl: '' },
              { ejercicioId: 'h4', nombre: 'Dominadas', series: '4', repeticiones: '10', descanso: '90s', observaciones: '', videoUrl: '' }
            ]
          }
        ];
      } else if (templateId === 'fuerza') {
        dias = [
          {
            nombre: 'Día A',
            ejercicios: [
              { ejercicioId: 'f1', nombre: 'Sentadilla', series: '5', repeticiones: '5', descanso: '180s', observaciones: '', videoUrl: '' },
              { ejercicioId: 'f2', nombre: 'Press de Banca', series: '5', repeticiones: '5', descanso: '180s', observaciones: '', videoUrl: '' }
            ]
          }
        ];
      } else {
        dias = [
          {
            nombre: 'General',
            ejercicios: [
              { ejercicioId: 'g1', nombre: `Base de ${template?.name}`, series: '4', repeticiones: '12', descanso: '60s', observaciones: '', videoUrl: '' }
            ]
          }
        ];
      }

      const { error } = await supabase
        .from('rutinas')
        .insert({
          socio_id: socio.id,
          nombre_socio: socio.nombre,
          dias,
          created_at: new Date().toISOString(),
          sucursal_id: socio.sucursal_id
        });

      if (error) throw error;

      toast.success(`Rutina de ${template?.name} aplicada.`);
      setRoutineAction('none');
    } catch (error: any) {
      console.error("Error applying template:", error);
      toast.error("Error al aplicar la plantilla");
    }
  };
  const [asistenciasMes, setAsistenciasMes] = useState<Asistencia[]>([]);
  const [rutinas, setRutinas] = useState<Routine[]>([]);
  const [cierres, setCierres] = useState<CierreGym[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dynamicCode, setDynamicCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getDayContent = (day: Date) => {
    const dayName = format(day, 'EEEE', { locale: es });
    const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    
    // Check if any routine has a day with this name
    const dayRoutines = rutinas.filter(r => (r.dias || []).some(d => (d?.nombre || '').toLowerCase().includes((dayName || '').toLowerCase())));
    const isClosed = cierres.find(c => c.fecha && isSameDay(parseISO(c.fecha), day));
    const trained = asistenciasMes.find(a => a.fecha && isSameDay(parseISO(a.fecha), day));
    
    return { 
      hasRoutine: dayRoutines.length > 0, 
      routines: dayRoutines,
      isClosed, 
      trained 
    };
  };

  useEffect(() => {
    const generateCode = () => {
      const now = new Date();
      const minute = now.getMinutes();
      const second = now.getSeconds();
      const socioPart = socio.id.slice(-4).toUpperCase();
      // Use both minute and a 30-second window for more dynamism
      const windowPart = Math.floor(second / 30);
      const timePart = `${minute.toString().padStart(2, '0')}${windowPart}`;
      setDynamicCode(`${socioPart}-${timePart}`);
      setTimeLeft(30 - (second % 30));
    };

    generateCode();
    const interval = setInterval(generateCode, 1000);
    return () => clearInterval(interval);
  }, [socio.id]);

  useEffect(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const fetchData = async () => {
      setLoading(true);
      try {
        // Asistencias
        const { data: asistenciasData } = await supabase
          .from('asistencias')
          .select('*')
          .eq('socio_id', socio.id)
          .gte('fecha', start.toISOString())
          .lte('fecha', end.toISOString());
        
        if (asistenciasData) setAsistenciasMes(asistenciasData);

        // Rutinas
        const { data: rutinasData } = await supabase
          .from('rutinas')
          .select('*')
          .eq('socio_id', socio.id);
        
        if (rutinasData) setRutinas(rutinasData);

        // Cierres Gym
        const { data: cierresData } = await supabase
          .from('cierres_gym')
          .select('*')
          .order('fecha', { ascending: true });
        
        if (cierresData) setCierres(cierresData);

        // Ventas
        const { data: ventasData } = await supabase
          .from('ventas')
          .select(`
            *,
            venta_items (
              *,
              inventario (nombre)
            )
          `)
          .eq('socio_id', socio.id)
          .order('fecha', { ascending: false });
        
        if (ventasData) setVentas(ventasData as any);

        // Productos
        const { data: productosData } = await supabase
          .from('inventario')
          .select('*')
          .eq('tipo', 'producto')
          .order('nombre', { ascending: true });
        
        if (productosData) setProductos(productosData as any);

      } catch (err) {
        console.error("Error fetching socio data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Real-time subscriptions
    const asistenciasChannel = supabase.channel('socio-asistencias')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asistencias', filter: `socio_id=eq.${socio.id}` }, fetchData)
      .subscribe();

    const rutinasChannel = supabase.channel('socio-rutinas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rutinas', filter: `socio_id=eq.${socio.id}` }, fetchData)
      .subscribe();

    const cierresChannel = supabase.channel('gym-cierres')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cierres_gym' }, fetchData)
      .subscribe();

    const ventasChannel = supabase.channel('socio-ventas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas', filter: `socio_id=eq.${socio.id}` }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(asistenciasChannel);
      supabase.removeChannel(rutinasChannel);
      supabase.removeChannel(cierresChannel);
      supabase.removeChannel(ventasChannel);
    };
  }, [socio.id]);

  const daysLeft = socio.fecha_vencimiento ? differenceInDays(parseISO(socio.fecha_vencimiento), new Date()) : 0;
  const isExpired = socio.fecha_vencimiento ? !isAfter(parseISO(socio.fecha_vencimiento), new Date()) : true;
  const isBanned = socio.estado === 'Baneado';
  const progress = Math.min((asistenciasMes.length / 20) * 100, 100);
  const daysTrained = asistenciasMes.length;

  const todayContent = useMemo(() => {
    const today = new Date();
    const dayName = format(today, 'EEEE', { locale: es });
    
    const dayRoutines = rutinas.filter(r => (r.dias || []).some(d => (d?.nombre || '').toLowerCase().includes((dayName || '').toLowerCase())));
    const isClosed = cierres.find(c => c.fecha && isSameDay(parseISO(c.fecha), today));
    
    return { hasRoutine: dayRoutines.length > 0, isClosed };
  }, [rutinas, cierres]);

  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});

  const toggleExercise = (routineId: string, diaIdx: number, exerciseIdx: number) => {
    const key = `${routineId}-${diaIdx}-${exerciseIdx}`;
    setCompletedExercises(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderHome = () => (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-8"
    >
      {/* Welcome */}
      <section>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-1">¡Hola, {socio.nombre.split(' ')[0]}! 👋</h2>
            <p className="text-gray-500 text-sm">Tu energía hoy es increíble.</p>
          </div>
          {todayContent.isClosed && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-3 py-1.5 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Gym Cerrado</span>
            </div>
          )}
        </div>
      </section>

      {/* Membership Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative overflow-hidden rounded-3xl p-6 border shadow-2xl",
          isBanned
            ? "bg-red-950/40 border-red-500/40"
            : isExpired 
              ? "bg-red-500/10 border-red-500/20" 
              : "bg-gradient-to-br from-lime-500/20 to-emerald-500/10 border-lime-500/20"
        )}
      >
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Membresía</p>
              <h3 className={cn(
                "text-3xl font-black",
                isBanned ? "text-red-500" : isExpired ? "text-red-400" : "text-lime-400"
              )}>
                {isBanned ? 'Baneado' : isExpired ? 'Vencida' : `${daysLeft} Días`}
              </h3>
              <p className="text-[10px] opacity-60 mt-1">Vence el {socio.fecha_vencimiento ? format(parseISO(socio.fecha_vencimiento), 'dd MMM, yyyy', { locale: es }) : 'N/A'}</p>
            </div>
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center border",
              isBanned ? "bg-red-500/20 border-red-500/30" : isExpired ? "bg-red-500/20 border-red-500/30" : "bg-lime-500/20 border-lime-500/30"
            )}>
              <Calendar className={cn("w-6 h-6", isBanned ? "text-red-500" : isExpired ? "text-red-400" : "text-lime-400")} />
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-bold">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isBanned ? "bg-red-600" : isExpired ? "bg-red-500" : "bg-lime-500"
            )} />
            <span className={isBanned ? "text-red-500" : isExpired ? "text-red-400" : "text-lime-400"}>
              {isBanned ? 'Cuenta Suspendida' : isExpired ? 'Renueva para seguir entrenando' : 'Estado: Activa'}
            </span>
          </div>
        </div>

        <div className={cn(
          "absolute top-[-20%] right-[-10%] w-40 h-40 blur-[60px] rounded-full",
          isBanned ? "bg-red-500/20" : "bg-lime-500/10"
        )} />
      </motion.div>

      {/* Access Code Section */}
      <section>
        <div className="bg-[#111] border border-white/10 rounded-3xl p-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 mb-2">
            <QrCode className="w-4 h-4 text-gray-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Código de Acceso Dinámico</h3>
          </div>
          
          <div className="bg-white p-4 rounded-2xl shadow-xl shadow-white/5 relative">
            <div className="w-40 h-40 bg-white rounded-lg flex items-center justify-center relative overflow-hidden">
              {isBanned ? (
                <QrCode className="w-24 h-24 text-black opacity-20" />
              ) : (
                <QRCodeSVG 
                  value={dynamicCode} 
                  size={140}
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: "https://picsum.photos/seed/gym/100/100",
                    x: undefined,
                    y: undefined,
                    height: 24,
                    width: 24,
                    excavate: true,
                  }}
                />
              )}
            </div>
            {isBanned && (
              <div className="absolute inset-0 bg-red-500/20 backdrop-blur-[2px] rounded-2xl flex items-center justify-center">
                <ShieldAlert className="w-12 h-12 text-red-500" />
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl font-mono font-black text-white tracking-widest">
                {isBanned ? '---' : dynamicCode}
              </span>
              {!isBanned && (
                <div className="relative w-5 h-5">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-white/10"
                    />
                    <motion.circle
                      cx="10"
                      cy="10"
                      r="8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray={50.26}
                      initial={{ strokeDashoffset: 50.26 }}
                      animate={{ strokeDashoffset: 50.26 * (1 - timeLeft / 30) }}
                      className="text-lime-500"
                    />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-500 text-center px-4">
              {isBanned 
                ? "Acceso bloqueado por suspensión" 
                : `Muestra este código en recepción. Se actualiza en ${timeLeft}s.`}
            </p>
          </div>
        </div>
      </section>

      {/* Progress Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-lime-500" />
            <h3 className="font-bold">Mi Progreso</h3>
          </div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            {format(new Date(), 'MMMM', { locale: es })}
          </span>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col">
              <span className="text-3xl font-black text-white">{daysTrained}</span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Días entrenados</span>
            </div>
            <div className="w-12 h-12 bg-lime-500/10 rounded-2xl flex items-center justify-center border border-lime-500/20">
              <Trophy className="w-6 h-6 text-lime-500" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-gray-400">Meta Mensual</span>
              <span className="text-xs font-bold text-lime-500">{daysTrained}/20 días</span>
            </div>
            <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-lime-500 to-emerald-500 rounded-full"
              />
            </div>
            <div className="flex items-center gap-2 bg-lime-500/5 border border-lime-500/10 p-3 rounded-2xl mt-4">
              <Award className="w-4 h-4 text-lime-500 shrink-0" />
              <p className="text-[10px] text-lime-400 font-medium leading-tight">
                {progress >= 100 
                  ? "¡Felicidades! Reclama tu recompensa en recepción." 
                  : `Faltan ${20 - daysTrained} días para tu recompensa mensual.`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#111] border border-white/10 rounded-3xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center">
            <Zap className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Racha</p>
            <p className="text-sm font-bold">3 Días</p>
          </div>
        </div>
        <div className="bg-[#111] border border-white/10 rounded-3xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500/10 rounded-xl flex items-center justify-center">
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Nivel</p>
            <p className="text-sm font-bold">Guerrero</p>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderRutinas = () => (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('home')} className="p-2 bg-white/5 rounded-xl">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold">Mis Rutinas</h2>
        </div>
        {rutinas.length > 0 && (
          <button 
            onClick={() => {
              if (confirm("¿Estás seguro de que quieres cambiar tu rutina actual? Esto te permitirá solicitar una nueva o crear otra.")) {
                // We don't necessarily delete the old one, just show the creation options
                setRoutineAction('create_guided');
              }
            }}
            className="text-[10px] font-bold uppercase tracking-widest bg-orange-500/10 text-orange-500 px-3 py-2 rounded-xl border border-orange-500/20 hover:bg-orange-500 hover:text-black transition-all"
          >
            Cambiar Rutina
          </button>
        )}
      </div>

      {rutinas.length === 0 || routineAction !== 'none' ? (
        <div className="space-y-6">
          <div className="bg-[#111] border border-white/10 rounded-3xl p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto">
              <Dumbbell className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-xl font-bold text-white">
              {routineAction === 'none' ? "No tienes una rutina asignada" : "Configura tu nueva rutina"}
            </h3>
            <p className="text-gray-400 max-w-xs mx-auto text-sm">
              {routineAction === 'none' 
                ? "Para empezar a entrenar, puedes solicitar una rutina a tu entrenador o crear una tú mismo."
                : "Elige cómo quieres establecer tu plan de entrenamiento."}
            </p>
            
            <div className="grid grid-cols-1 gap-3 pt-4">
              <button 
                onClick={() => setRoutineAction('request')}
                className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Solicitar a un Entrenador
              </button>
              <button 
                onClick={() => setRoutineAction('create_guided')}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl border border-white/10 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Crear mi propia rutina
              </button>
              {routineAction !== 'none' && rutinas.length > 0 && (
                <button 
                  onClick={() => setRoutineAction('none')}
                  className="w-full text-gray-500 text-xs font-bold uppercase tracking-widest py-2"
                >
                  Volver a mi rutina actual
                </button>
              )}
            </div>
          </div>

          {routineAction === 'request' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-6 space-y-4"
            >
              <h4 className="font-bold text-orange-500">¿Confirmas la solicitud?</h4>
              <p className="text-sm text-gray-300">Tu entrenador recibirá una notificación y te asignará una rutina pronto.</p>
              <div className="flex gap-3">
                <button onClick={handleRequestRoutine} className="flex-1 bg-orange-500 text-black font-bold py-2 rounded-xl">Confirmar</button>
                <button onClick={() => setRoutineAction('none')} className="flex-1 bg-white/5 text-white py-2 rounded-xl border border-white/10">Cancelar</button>
              </div>
            </motion.div>
          )}

          {routineAction === 'create_guided' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white">Elige un objetivo</h4>
                <button onClick={() => setRoutineAction('none')} className="text-xs text-gray-500 hover:text-white">Cancelar</button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {routineTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleApplyTemplate(template.id)}
                    className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-left group"
                  >
                    <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                      {template.icon}
                    </div>
                    <div>
                      <p className="font-bold text-white">{template.name}</p>
                      <p className="text-xs text-gray-500">{template.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600 ml-auto" />
                  </button>
                ))}
                <button
                  onClick={() => setRoutineAction('create_manual')}
                  className="p-4 bg-white/5 border border-dashed border-white/20 rounded-2xl text-center text-gray-500 hover:text-white hover:border-white/40 transition-all"
                >
                  Crear manualmente (Avanzado)
                </button>
                <button
                  onClick={() => setShowExerciseCatalog(true)}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Info className="w-4 h-4" /> Ver Catálogo de Ejercicios
                </button>
              </div>
            </motion.div>
          )}

          {routineAction === 'create_manual' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#111] border border-white/10 rounded-3xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white">Nueva Rutina Manual</h4>
                <button onClick={() => setRoutineAction('create_guided')} className="text-xs text-gray-500 hover:text-white">Atrás</button>
              </div>
              <form onSubmit={handleCreateManualRoutine} className="space-y-4">
                <p className="text-sm text-gray-400 italic">Se creará una rutina base de 3 días para que puedas empezar.</p>
                <button type="submit" className="w-full bg-orange-500 text-black font-bold py-3 rounded-xl">Crear Rutina Base</button>
              </form>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {rutinas.map((rutina) => (
            <div key={rutina.id} className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">Plan de Entrenamiento</h3>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(rutina.dias || []).map((day, dIdx) => (
                        <span key={dIdx} className="text-[10px] font-black uppercase tracking-widest bg-lime-500/10 text-lime-500 px-2 py-0.5 rounded-md border border-lime-500/20">
                          {day.nombre}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingRoutine(rutina)}
                      className="p-2 bg-white/5 text-gray-400 rounded-xl border border-white/10 hover:text-white transition-all"
                      title="Editar Ejercicios"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('¿Estás seguro de que quieres cambiar tu plan de entrenamiento? Esto te permitirá solicitar uno nuevo o crear uno diferente.')) {
                          setRoutineAction('create_guided');
                        }
                      }}
                      className="p-2 bg-orange-500/10 text-orange-500 rounded-xl border border-orange-500/20 hover:bg-orange-500 hover:text-black transition-all"
                      title="Cambiar Plan"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 bg-lime-500/10 rounded-xl flex items-center justify-center border border-lime-500/20">
                      <Dumbbell className="w-5 h-5 text-lime-500" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-8">
                {(rutina.dias || []).map((dia, diaIdx) => (
                  <div key={diaIdx} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-white/5" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-500/50">{dia.nombre}</span>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                    
                    <div className="space-y-4">
                      {(dia.ejercicios || []).map((ex, exIdx) => {
                        const isCompleted = completedExercises[`${rutina.id}-${diaIdx}-${exIdx}`];
                        return (
                          <div key={exIdx} className="flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => toggleExercise(rutina.id, diaIdx, exIdx)}
                                className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all border",
                                  isCompleted 
                                    ? "bg-lime-500 border-lime-500 text-black" 
                                    : "bg-white/5 border-white/10 text-gray-500 group-hover:bg-lime-500/10 group-hover:text-lime-500"
                                )}
                              >
                                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : exIdx + 1}
                              </button>
                              <div className={cn("transition-all", isCompleted && "opacity-40 line-through")}>
                                <p className="font-bold text-sm">{ex.nombre}</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                  {ex.series} Series • {ex.repeticiones} Reps • {ex.descanso}
                                </p>
                                {ex.observaciones && (
                                  <p className="text-[10px] text-gray-600 italic mt-0.5">{ex.observaciones}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {ex.videoUrl && (
                                <a 
                                  href={ex.videoUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="p-2 bg-lime-500/10 text-lime-500 rounded-lg hover:bg-lime-500 hover:text-black transition-all"
                                >
                                  <Play className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Routine Modal */}
      <AnimatePresence>
        {editingRoutine && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingRoutine(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h3 className="text-xl font-bold text-white">Editar Rutina</h3>
                <button 
                  onClick={() => setEditingRoutine(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <XCircle className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-8">
                {(editingRoutine.dias || []).map((dia, diaIdx) => (
                  <div key={diaIdx} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <input 
                        value={dia.nombre}
                        onChange={(e) => {
                          const newDias = [...editingRoutine.dias];
                          newDias[diaIdx].nombre = e.target.value;
                          setEditingRoutine({...editingRoutine, dias: newDias});
                        }}
                        className="bg-transparent border-b border-white/10 py-1 text-sm font-bold text-lime-500 focus:border-lime-500 outline-none flex-1 mr-4"
                      />
                      <button 
                        onClick={() => {
                          const newDias = editingRoutine.dias.filter((_, i) => i !== diaIdx);
                          setEditingRoutine({...editingRoutine, dias: newDias});
                        }}
                        className="text-red-500/50 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(dia.ejercicios || []).map((ex, exIdx) => (
                        <div key={exIdx} className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-3">
                          <div className="flex justify-between items-center">
                            <input 
                              value={ex.nombre}
                              onChange={(e) => {
                                const newDias = [...editingRoutine.dias];
                                newDias[diaIdx].ejercicios[exIdx].nombre = e.target.value;
                                setEditingRoutine({...editingRoutine, dias: newDias});
                              }}
                              className="bg-transparent border-b border-white/10 py-1 text-sm font-bold focus:border-lime-500 outline-none w-full mr-4"
                              placeholder="Nombre del ejercicio"
                            />
                            <button 
                              onClick={() => {
                                const newDias = [...editingRoutine.dias];
                                newDias[diaIdx].ejercicios = newDias[diaIdx].ejercicios.filter((_, i) => i !== exIdx);
                                setEditingRoutine({...editingRoutine, dias: newDias});
                              }}
                              className="text-red-500/50 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] text-gray-500 uppercase font-bold">Series</label>
                              <input 
                                value={ex.series}
                                onChange={(e) => {
                                  const newDias = [...editingRoutine.dias];
                                  newDias[diaIdx].ejercicios[exIdx].series = e.target.value;
                                  setEditingRoutine({...editingRoutine, dias: newDias});
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-lime-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-gray-500 uppercase font-bold">Reps</label>
                              <input 
                                value={ex.repeticiones}
                                onChange={(e) => {
                                  const newDias = [...editingRoutine.dias];
                                  newDias[diaIdx].ejercicios[exIdx].repeticiones = e.target.value;
                                  setEditingRoutine({...editingRoutine, dias: newDias});
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-lime-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-gray-500 uppercase font-bold">Descanso</label>
                              <input 
                                value={ex.descanso}
                                onChange={(e) => {
                                  const newDias = [...editingRoutine.dias];
                                  newDias[diaIdx].ejercicios[exIdx].descanso = e.target.value;
                                  setEditingRoutine({...editingRoutine, dias: newDias});
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-lime-500"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-gray-500 uppercase font-bold">Notas</label>
                            <input 
                              value={ex.observaciones}
                              onChange={(e) => {
                                const newDias = [...editingRoutine.dias];
                                newDias[diaIdx].ejercicios[exIdx].observaciones = e.target.value;
                                setEditingRoutine({...editingRoutine, dias: newDias});
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-lime-500"
                              placeholder="Notas..."
                            />
                          </div>
                        </div>
                      ))}

                      <button 
                        onClick={() => {
                          const newDias = [...editingRoutine.dias];
                          newDias[diaIdx].ejercicios.push({ ejercicioId: 'manual', nombre: '', series: '3', repeticiones: '12', descanso: '60s', observaciones: '' });
                          setEditingRoutine({...editingRoutine, dias: newDias});
                        }}
                        className="w-full py-2 border border-dashed border-white/20 rounded-xl text-[10px] font-bold text-gray-500 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Plus className="w-3 h-3" /> Añadir Ejercicio
                      </button>
                    </div>
                  </div>
                ))}

                <button 
                  onClick={() => {
                    const newDias = [...editingRoutine.dias, { nombre: `Día ${editingRoutine.dias.length + 1}`, ejercicios: [] }];
                    setEditingRoutine({...editingRoutine, dias: newDias});
                  }}
                  className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Añadir Día
                </button>
              </div>

              <div className="p-6 border-t border-white/10 bg-white/5">
                <button 
                  onClick={handleUpdateRoutine}
                  className="w-full bg-lime-500 text-black font-black py-4 rounded-2xl uppercase tracking-tighter hover:bg-lime-400 transition-all"
                >
                  Guardar Cambios
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Exercise Catalog Modal */}
      <AnimatePresence>
        {showExerciseCatalog && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExerciseCatalog(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-bold">Catálogo de Ejercicios</h3>
                <button onClick={() => setShowExerciseCatalog(false)}><XCircle className="w-6 h-6 text-gray-500" /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4">
                {EXERCISE_CATALOG.map((ex, i) => (
                  <div
                    key={i}
                    className="w-full text-left p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-lime-500/10 hover:border-lime-500/30 transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-white group-hover:text-lime-500">{ex.nombre}</p>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded text-gray-500">{ex.musculo}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{ex.descripcion}</p>
                    {ex.videoUrl && (
                      <div className="mt-3 aspect-video rounded-xl overflow-hidden bg-black border border-white/5">
                        <video src={ex.videoUrl} controls className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderCalendario = () => {
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const selectedDayData = selectedDay ? getDayContent(selectedDay) : null;

    return (
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setView('home')} className="p-2 bg-white/5 rounded-xl">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold">Calendario</h2>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-lg capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h3>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 bg-white/5 rounded-lg hover:bg-white/10">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={nextMonth} className="p-2 bg-white/5 rounded-lg hover:bg-white/10">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-black text-gray-600 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, i) => {
              const { hasRoutine, isClosed, trained } = getDayContent(day);
              const isCurrentMonth = format(day, 'M') === format(currentMonth, 'M');
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              
              return (
                <button 
                  key={i} 
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "aspect-square rounded-xl flex flex-col items-center justify-center relative border transition-all",
                    !isCurrentMonth ? "opacity-20 border-transparent" : "border-white/5 bg-white/[0.02]",
                    isToday(day) && "border-lime-500/50 bg-lime-500/5",
                    isSelected && "border-lime-500 ring-2 ring-lime-500/20 z-10",
                    isClosed && "bg-red-500/10 border-red-500/20"
                  )}
                >
                  <span className={cn(
                    "text-xs font-bold",
                    isToday(day) ? "text-lime-500" : isClosed ? "text-red-500" : "text-gray-300"
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  <div className="flex gap-0.5 mt-1">
                    {hasRoutine && !isClosed && <div className="w-1 h-1 rounded-full bg-blue-500" />}
                    {trained && <div className="w-1 h-1 rounded-full bg-lime-500" />}
                    {isClosed && <div className="w-1 h-1 rounded-full bg-red-500" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Day Details */}
          <AnimatePresence mode="wait">
            {selectedDay && (
              <motion.div 
                key={selectedDay.toISOString()}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 pt-6 border-t border-white/5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">
                    {format(selectedDay, "EEEE, d 'de' MMMM", { locale: es })}
                  </h4>
                  {isToday(selectedDay) && (
                    <span className="text-[10px] font-black uppercase tracking-widest bg-lime-500/10 text-lime-500 px-2 py-0.5 rounded-md border border-lime-500/20">
                      Hoy
                    </span>
                  )}
                </div>

                {selectedDayData?.isClosed ? (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-sm font-bold text-red-400">Gimnasio Cerrado</p>
                      <p className="text-xs text-red-500/60">{selectedDayData.isClosed.motivo}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDayData?.trained && (
                      <div className="bg-lime-500/10 border border-lime-500/20 rounded-2xl p-4 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-lime-500" />
                        <p className="text-sm font-bold text-lime-400">¡Entrenamiento completado!</p>
                      </div>
                    )}

                    {selectedDayData?.hasRoutine ? (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-blue-500" />
                          <p className="text-sm font-bold text-blue-400">Rutina Programada</p>
                        </div>
                    <div className="space-y-4">
                      {selectedDayData.routines.map((r, ri) => (
                        <div key={ri} className="space-y-4">
                          {(r.dias || []).filter(d => (d?.nombre || '').toLowerCase().includes((format(selectedDay, 'EEEE', { locale: es }) || '').toLowerCase())).map((dia, di) => (
                            <div key={di} className="space-y-2">
                              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{dia.nombre}</p>
                              {(dia.ejercicios || []).map((ex, ei) => (
                                <div key={ei} className="flex items-center justify-between text-xs text-blue-300/80">
                                  <span>{ex.nombre}</span>
                                  <span className="font-mono">{ex.series}x{ex.repeticiones}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                      </div>
                    ) : (
                      !selectedDayData?.trained && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                          <Info className="w-5 h-5 text-gray-500" />
                          <p className="text-sm font-bold text-gray-400">No hay rutinas para este día</p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 space-y-3 pt-6 border-t border-white/5">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Día de Rutina</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-lime-500" />
              <span>Entrenamiento Completado</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Gimnasio Cerrado</span>
            </div>
          </div>
        </div>

        {/* Next Closures */}
        {cierres.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
              <Info className="w-4 h-4" /> Próximos Cierres
            </h3>
            {cierres.filter(c => c.fecha && isAfter(c.fecha.toDate(), new Date())).slice(0, 3).map(c => (
              <div key={c.id} className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-red-400">{c.motivo}</p>
                  <p className="text-[10px] text-red-500/60 font-bold uppercase tracking-widest">
                    {c.fecha && format(c.fecha.toDate(), 'EEEE dd MMMM', { locale: es })}
                  </p>
                </div>
                <ShieldAlert className="w-5 h-5 text-red-500/30" />
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  const renderPerfil = () => (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => setView('home')} className="p-2 bg-white/5 rounded-xl">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold">Mi Perfil</h2>
      </div>

      {/* User Info */}
      <div className="bg-[#111] border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full bg-lime-500/10 border border-lime-500/20 flex items-center justify-center mb-4">
          <User className="w-12 h-12 text-lime-500" />
        </div>
        <h3 className="text-xl font-bold">{socio.nombre}</h3>
        <p className="text-sm text-gray-500">{socio.email}</p>
        <div className="mt-4 px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">ID: {socio.id.slice(-8).toUpperCase()}</span>
        </div>
        
        <button 
          onClick={() => setShowPasswordModal(true)}
          className="mt-6 w-full bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 font-bold py-3 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
        >
          <LockIcon className="w-4 h-4 text-lime-500" />
          Cambiar Contraseña
        </button>
      </div>

      {/* Purchase History */}
      <div className="space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-lime-500" />
          Historial de Compras
        </h3>
        
        {ventas.length === 0 ? (
          <div className="bg-[#111] border border-white/10 rounded-3xl p-8 text-center text-gray-500 text-sm">
            No tienes compras registradas aún.
          </div>
        ) : (
          <div className="space-y-3">
            {ventas.map((venta) => (
              <div key={venta.id} className="bg-[#111] border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                      {venta.fecha && format(venta.fecha.toDate(), 'dd MMM, yyyy HH:mm', { locale: es })}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <CreditCard className="w-3 h-3 text-gray-600" />
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{venta.metodoPago}</span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-lime-500">${venta.total}</span>
                </div>
                <div className="space-y-1 pt-2 border-t border-white/5">
                  {venta.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[10px] text-gray-400">
                      <span>{item.nombre} x{item.cantidad}</span>
                      <span>${item.precio * item.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderTienda = () => {
    const cartTotal = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const cartCount = cart.reduce((sum, item) => sum + item.cantidad, 0);

    const addToCart = (prod: any) => {
      setCart(prev => {
        const existing = prev.find(item => item.id === prod.id);
        if (existing) {
          return prev.map(item => 
            item.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item
          );
        }
        return [...prev, { id: prod.id, nombre: prod.nombre, precio: prod.precio, cantidad: 1 }];
      });
      toast.success(`${prod.nombre} añadido al carrito`);
    };

    const removeFromCart = (id: string) => {
      setCart(prev => prev.filter(item => item.id !== id));
    };

    const updateCartQty = (id: string, delta: number) => {
      setCart(prev => prev.map(item => {
        if (item.id === id) {
          const newQty = Math.max(1, item.cantidad + delta);
          return { ...item, cantidad: newQty };
        }
        return item;
      }));
    };

    const handleGenerateQR = () => {
      if (cart.length === 0) return;
      const data = {
        type: 'sale',
        socioId: socio.id,
        socioNombre: socio.nombre,
        items: cart,
        total: cartTotal,
        timestamp: Date.now()
      };
      setQrData(JSON.stringify(data));
    };

    return (
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="space-y-8"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('home')} className="p-2 bg-white/5 rounded-xl">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold">Tienda Gym</h2>
          </div>
          <button 
            onClick={() => setShowCart(true)}
            className="relative p-3 bg-lime-500 rounded-2xl text-black shadow-lg shadow-lime-500/20"
          >
            <ShoppingCart className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#0a0a0a]">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        <div className="bg-lime-500/10 border border-lime-500/20 rounded-3xl p-6 flex items-center gap-4">
          <ShoppingBag className="w-10 h-10 text-lime-500" />
          <div>
            <p className="text-sm font-bold text-lime-400">Suplementos y Bebidas</p>
            <p className="text-xs text-lime-500/60">Añade productos y genera tu QR para pagar.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {productos.length === 0 ? (
            <div className="col-span-2 py-20 text-center text-gray-500">
              No hay productos disponibles en el catálogo.
            </div>
          ) : (
            productos.map((prod) => (
              <div key={prod.id} className="bg-[#111] border border-white/10 rounded-3xl p-5 space-y-3 group hover:border-lime-500/30 transition-all flex flex-col">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="w-6 h-6 text-gray-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm leading-tight">{prod.nombre}</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{prod.categoria || 'General'}</p>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-lg font-mono font-bold text-lime-500">${prod.precio}</p>
                  <button 
                    onClick={() => addToCart(prod)}
                    className="p-2 bg-lime-500/10 text-lime-500 rounded-xl hover:bg-lime-500 hover:text-black transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Modal */}
        <AnimatePresence>
          {showCart && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowCart(false);
                  setQrData(null);
                }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                  <h3 className="text-xl font-bold text-white">Mi Carrito</h3>
                  <button 
                    onClick={() => {
                      setShowCart(false);
                      setQrData(null);
                    }}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                  {qrData ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center">
                      <div className="bg-white p-4 rounded-3xl shadow-2xl shadow-lime-500/20">
                        <QRCodeSVG value={qrData} size={200} level="H" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-lime-500 mb-2">¡Listo para pagar!</h4>
                        <p className="text-sm text-gray-400">Muestra este código en recepción para completar tu compra.</p>
                      </div>
                      <button 
                        onClick={() => setQrData(null)}
                        className="text-xs font-bold text-gray-500 hover:text-white underline underline-offset-4"
                      >
                        Volver al carrito
                      </button>
                    </div>
                  ) : cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-600 space-y-4">
                      <ShoppingCart className="w-16 h-16 opacity-20" />
                      <p className="font-bold">Tu carrito está vacío</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                          <div className="flex-1">
                            <h4 className="text-sm font-bold">{item.nombre}</h4>
                            <p className="text-xs text-gray-500 font-mono">${item.precio} x {item.cantidad}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center bg-black/40 rounded-lg border border-white/10">
                              <button onClick={() => updateCartQty(item.id, -1)} className="p-1 hover:text-lime-500"><Minus className="w-3 h-3" /></button>
                              <span className="text-xs font-mono w-6 text-center">{item.cantidad}</span>
                              <button onClick={() => updateCartQty(item.id, 1)} className="p-1 hover:text-lime-500"><Plus className="w-3 h-3" /></button>
                            </div>
                            <button onClick={() => removeFromCart(item.id)} className="text-red-500/50 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {!qrData && cart.length > 0 && (
                  <div className="p-6 border-t border-white/10 bg-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Estimado</span>
                      <span className="text-2xl font-mono font-bold text-lime-500">${cartTotal}</span>
                    </div>
                    <button 
                      onClick={handleGenerateQR}
                      className="w-full bg-lime-500 text-black font-black py-4 rounded-2xl uppercase tracking-tighter hover:bg-lime-400 transition-all flex items-center justify-center gap-3 shadow-lg shadow-lime-500/20"
                    >
                      <CreditCard className="w-6 h-6" />
                      Generar QR de Pago
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 pb-24 font-sans max-w-md mx-auto border-x border-white/5">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-lime-500 rounded-xl flex items-center justify-center shadow-lg shadow-lime-500/20">
            <Dumbbell className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Gariba Gym</h1>
            <p className="text-[10px] text-lime-500 font-bold uppercase tracking-widest">Socio Pro</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-5 h-5 text-gray-400" />
        </button>
      </header>

      <AnimatePresence mode="wait">
        {view === 'home' && renderHome()}
        {view === 'rutinas' && renderRutinas()}
        {view === 'calendario' && renderCalendario()}
        {view === 'perfil' && renderPerfil()}
        {view === 'tienda' && renderTienda()}
      </AnimatePresence>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#0a0a0a]/80 backdrop-blur-xl border-t border-white/5 p-4 flex justify-around items-center z-50">
        <button 
          onClick={() => setView('home')}
          className={cn("p-2 transition-colors", view === 'home' ? "text-lime-500" : "text-gray-500")}
        >
          <Zap className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setView('rutinas')}
          className={cn("p-2 transition-colors", view === 'rutinas' ? "text-lime-500" : "text-gray-500")}
        >
          <Dumbbell className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setView('calendario')}
          className={cn("p-2 transition-colors relative", view === 'calendario' ? "text-lime-500" : "text-gray-500")}
        >
          <Calendar className="w-6 h-6" />
          {todayContent.hasRoutine && !todayContent.isClosed && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#0a0a0a]" />
          )}
        </button>
        <button 
          onClick={() => setView('tienda')}
          className={cn("p-2 transition-colors", view === 'tienda' ? "text-lime-500" : "text-gray-500")}
        >
          <ShoppingBag className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setView('perfil')}
          className={cn("p-2 transition-colors", view === 'perfil' ? "text-lime-500" : "text-gray-500")}
        >
          <User className="w-6 h-6" />
        </button>
      </div>
      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => !socio.mustChangePassword && setShowPasswordModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-8"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-lime-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <LockIcon className="w-8 h-8 text-lime-500" />
                </div>
                <h3 className="text-xl font-bold text-white">Actualizar Contraseña</h3>
                {socio.mustChangePassword && (
                  <p className="text-xs text-lime-500/60 mt-2">Por seguridad, debes cambiar tu contraseña inicial.</p>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nueva Contraseña</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:outline-none focus:border-lime-500/50 transition-colors text-white"
                    placeholder="Mínimo 4 caracteres"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Confirmar Contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:outline-none focus:border-lime-500/50 transition-colors text-white"
                    placeholder="Repite la contraseña"
                  />
                </div>

                <button
                  onClick={handlePasswordChange}
                  disabled={isChangingPassword}
                  className="w-full bg-lime-500 hover:bg-lime-600 disabled:opacity-50 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] mt-4"
                >
                  {isChangingPassword ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Guardar Nueva Contraseña"
                  )}
                </button>

                {!socio.mustChangePassword && (
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="w-full text-gray-500 text-xs font-bold uppercase tracking-widest py-2 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Legal Modal */}
      <AnimatePresence>
        {showLegalModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#111] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-lime-500/10 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-lime-500 flex items-center justify-center shadow-lg shadow-lime-500/20">
                    <ShieldCheck className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Aviso Legal</h3>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Revisión Obligatoria</p>
                  </div>
                </div>
              </div>

              <div className="flex border-b border-white/5 bg-black/20">
                <button
                  onClick={() => setLegalTab('terms')}
                  className={cn(
                    "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                    legalTab === 'terms' ? "border-lime-500 text-lime-500 bg-lime-500/5" : "border-transparent text-gray-500 hover:text-white"
                  )}
                >
                  Términos y Condiciones
                </button>
                <button
                  onClick={() => setLegalTab('privacy')}
                  className={cn(
                    "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                    legalTab === 'privacy' ? "border-lime-500 text-lime-500 bg-lime-500/5" : "border-transparent text-gray-500 hover:text-white"
                  )}
                >
                  Privacidad
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="prose prose-invert max-w-none">
                  {legalTab === 'terms' ? (
                    <div className="space-y-4 text-gray-400 text-sm leading-relaxed">
                      {TERMS_AND_CONDITIONS.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4 text-gray-400 text-sm leading-relaxed">
                      {PRIVACY_POLICY.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 border-t border-white/5 bg-black/40">
                <p className="text-[10px] text-gray-500 text-center mb-6 uppercase tracking-widest font-bold">
                  Al hacer clic en aceptar, confirmas que has leído y aceptas nuestros términos y políticas.
                </p>
                <button
                  onClick={handleAcceptTerms}
                  className="w-full bg-lime-500 hover:bg-lime-600 text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-lime-500/20 uppercase tracking-widest"
                >
                  Aceptar y Continuar
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Legal Modal */}
      <AnimatePresence>
        {showLegalModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#111] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-lime-500/10 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-lime-500 flex items-center justify-center shadow-lg shadow-lime-500/20">
                    <ShieldCheck className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Aviso Legal</h3>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Revisión Obligatoria</p>
                  </div>
                </div>
              </div>

              <div className="flex border-b border-white/5 bg-black/20">
                <button
                  onClick={() => setLegalTab('terms')}
                  className={cn(
                    "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                    legalTab === 'terms' ? "border-lime-500 text-lime-500 bg-lime-500/5" : "border-transparent text-gray-500 hover:text-white"
                  )}
                >
                  Términos y Condiciones
                </button>
                <button
                  onClick={() => setLegalTab('privacy')}
                  className={cn(
                    "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                    legalTab === 'privacy' ? "border-lime-500 text-lime-500 bg-lime-500/5" : "border-transparent text-gray-500 hover:text-white"
                  )}
                >
                  Privacidad
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="prose prose-invert max-w-none">
                  {legalTab === 'terms' ? (
                    <div className="space-y-4 text-gray-400 text-sm leading-relaxed">
                      {TERMS_AND_CONDITIONS.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4 text-gray-400 text-sm leading-relaxed">
                      {PRIVACY_POLICY.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 border-t border-white/5 bg-black/40">
                <p className="text-[10px] text-gray-500 text-center mb-6 uppercase tracking-widest font-bold">
                  Al hacer clic en aceptar, confirmas que has leído y aceptas nuestros términos y políticas.
                </p>
                <button
                  onClick={handleAcceptTerms}
                  className="w-full bg-lime-500 hover:bg-lime-600 text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-lime-500/20 uppercase tracking-widest"
                >
                  Aceptar y Continuar
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
