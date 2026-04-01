import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'motion/react';
import { Socio, UserProfile, Sucursal } from '../types';
import { 
  Users, 
  Plus, 
  LogOut, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Dumbbell,
  MoreVertical,
  ShoppingCart,
  LayoutDashboard,
  Wallet,
  UserCheck,
  BellRing,
  MessageSquare,
  ChevronDown,
  Settings,
  MapPin,
  Trash2,
  Edit3,
  RefreshCw,
  UserMinus,
  ShieldAlert,
  UserCircle,
  Ban,
  Package,
  BarChart3,
  BookOpen,
  Lock as LockIcon
} from 'lucide-react';
import { differenceInDays, isAfter, format, startOfDay, endOfDay, parseISO } from 'date-fns';
import AddSocioModal from './AddSocioModal';
import EditSocioModal from './EditSocioModal';
import RenewMembershipModal from './RenewMembershipModal';
import SocioProfileModal from './SocioProfileModal';
import PenalizeSocioModal from './PenalizeSocioModal';
import POS from './POS';
import CheckIn from './CheckIn';
import RetentionView from './RetentionView';
import RutinasModule from './RutinasModule';
import WhatsAppModule from './WhatsAppModule';
import ConfiguracionModule from './ConfiguracionModule';
import InventarioModule from './InventarioModule';
import ReportsModule from './ReportsModule';
import StaffModule from './StaffModule';
import CatalogoRutinasModule from './CatalogoRutinasModule';
import { cn } from '../lib/utils';
import { Toaster, toast } from 'sonner';
import { TERMS_AND_CONDITIONS, PRIVACY_POLICY } from '../constants/legal';
import { ShieldCheck, FileText, ArrowRight } from 'lucide-react';

type View = 'socios' | 'pos' | 'checkin' | 'retencion' | 'rutinas' | 'catalogo_rutinas' | 'whatsapp' | 'sucursales' | 'inventario' | 'reportes' | 'staff';

export default function Dashboard({ user, onSwitchToSocio }: { user: User, onSwitchToSocio: () => void }) {
  const [view, setView] = useState<View>('socios');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy'>('terms');
  const [adminSocio, setAdminSocio] = useState<Socio | null>(null);
  const [resettingSocioPassword, setResettingSocioPassword] = useState<Socio | null>(null);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [ventasHoy, setVentasHoy] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [selectedSucursalId, setSelectedSucursalId] = useState<string>('');
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewingSocio, setViewingSocio] = useState<Socio | null>(null);
  const [penalizingSocio, setPenalizingSocio] = useState<Socio | null>(null);
  const [selectedSocioForRenewal, setSelectedSocioForRenewal] = useState<Socio | null>(null);

  // Fetch User Profile and Role
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (data) {
          // Force owner for the primary admin email
          if (user.email === 'chkereke@gmail.com' && data.role !== 'owner') {
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({ role: 'owner' })
              .eq('id', user.id);
            
            if (!updateError) {
              setUserProfile({ ...data, role: 'owner' });
            }
          } else {
            setUserProfile(data);
          }
        } else {
          // Create initial profile if it doesn't exist
          const initialRole = user.email === 'chkereke@gmail.com' ? 'owner' : 'receptionist';
          const newProfile: UserProfile = {
            id: user.id,
            email: user.email || '',
            role: initialRole
          };
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert(newProfile);
          
          if (!insertError) {
            setUserProfile(newProfile);
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, [user]);

  // Fetch Sucursales
  useEffect(() => {
    const fetchSucursales = async () => {
      const { data, error } = await supabase
        .from('sucursales')
        .select('*');
      
      if (data) {
        setSucursales(data);
        if (data.length > 0 && !selectedSucursalId) {
          setSelectedSucursalId(data[0].id);
        }
      }
    };
    fetchSucursales();
  }, []);

  useEffect(() => {
    if (!selectedSucursalId || sucursales.length === 0) return;

    setLoading(true);
    
    // Fetch socios
    const fetchSocios = async () => {
      const { data, error } = await supabase
        .from('socios')
        .select('*')
        .eq('sucursal_id', selectedSucursalId);
      
      if (data) {
        const sorted = [...data].sort((a, b) => {
          const dateA = a.fecha_vencimiento ? new Date(a.fecha_vencimiento).getTime() : 0;
          const dateB = b.fecha_vencimiento ? new Date(b.fecha_vencimiento).getTime() : 0;
          return dateB - dateA;
        });
        setSocios(sorted as Socio[]);
      }
      setLoading(false);
    };

    // Fetch today's sales
    const fetchVentas = async () => {
      const today = new Date();
      const start = startOfDay(today).toISOString();
      const end = endOfDay(today).toISOString();

      const { data, error } = await supabase
        .from('ventas')
        .select('total')
        .eq('sucursal_id', selectedSucursalId)
        .gte('fecha', start)
        .lte('fecha', end);
      
      if (data) {
        const total = data.reduce((sum, v) => sum + (v.total || 0), 0);
        setVentasHoy(total);
      }
    };

    fetchSocios();
    fetchVentas();

    // Subscribe to changes
    const sociosChannel = supabase.channel('socios-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'socios', filter: `sucursal_id=eq.${selectedSucursalId}` }, fetchSocios)
      .subscribe();

    const ventasChannel = supabase.channel('ventas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas', filter: `sucursal_id=eq.${selectedSucursalId}` }, fetchVentas)
      .subscribe();

    return () => {
      supabase.removeChannel(sociosChannel);
      supabase.removeChannel(ventasChannel);
    };
  }, [selectedSucursalId, sucursales]);

  useEffect(() => {
    if (userProfile && userProfile.accepted_terms === false) {
      setShowLegalModal(true);
    }
  }, [userProfile]);

  const handleAcceptTerms = async () => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ accepted_terms: true })
        .eq('id', user.id);
      
      if (!error) {
        setShowLegalModal(false);
        toast.success('Has aceptado los términos y condiciones');
      }
    } catch (error) {
      toast.error('Error al aceptar los términos');
    }
  };
  const [newSocioPassword, setNewSocioPassword] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingSocio, setEditingSocio] = useState<Socio | null>(null);
  const [renewingSocio, setRenewingSocio] = useState<Socio | null>(null);
  const [deletingSocio, setDeletingSocio] = useState<Socio | null>(null);

  const handleBranchChange = (id: string, name: string) => {
    toast.success(`Cambiando a sucursal ${name}...`);
    setSelectedSucursalId(id);
    setIsBranchMenuOpen(false);
  };

  const hasPermission = (permission: string) => {
    // Fallback for the primary owner email to ensure they always have access
    if (user.email === 'chkereke@gmail.com') return true;

    if (!userProfile) return false;
    const role = userProfile.role;
    
    switch (permission) {
      case 'view_cash_cut':
        return ['owner', 'manager'].includes(role);
      case 'manage_branches':
        return ['owner', 'manager'].includes(role);
      case 'manage_staff':
        return ['owner'].includes(role);
      case 'delete_socio':
        return ['owner', 'manager'].includes(role);
      case 'edit_socio':
        return ['owner', 'manager', 'receptionist'].includes(role);
      case 'view_reports':
        return ['owner', 'manager'].includes(role);
      case 'manage_inventory':
        return ['owner', 'manager'].includes(role);
      case 'pos_access':
        return ['owner', 'manager', 'receptionist'].includes(role);
      case 'rutinas_access':
        return ['owner', 'manager', 'trainer'].includes(role);
      case 'view_retention':
        return ['owner', 'manager', 'receptionist'].includes(role);
      default:
        return true;
    }
  };

  const selectedSucursal = sucursales.find(s => s.id === selectedSucursalId);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const filteredSocios = socios.filter(s => 
    (s.nombre || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = socios.filter(s => {
    const isExpired = !isAfter(new Date(s.fecha_vencimiento), new Date());
    return s.estado === 'Activa' && !isExpired;
  }).length;

  const expiredCount = socios.filter(s => {
    const isExpired = !isAfter(new Date(s.fecha_vencimiento), new Date());
    return s.estado === 'Vencida' || (s.estado === 'Activa' && isExpired);
  }).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#111] border-b border-white/10 z-[100]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Dumbbell className="w-4 h-4 text-black" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Gariba Gym</h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-white/5 rounded-xl transition-colors"
        >
          <MoreVertical className="w-6 h-6 text-gray-400 rotate-90" />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <motion.aside 
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed md:relative inset-y-0 left-0 w-[280px] md:w-64 bg-[#111] border-r border-white/10 p-6 flex flex-col gap-8 z-[110] md:z-auto",
              !isSidebarOpen && "hidden md:flex"
            )}
          >
            {/* Mobile Close Button */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <XCircle className="w-6 h-6 text-gray-500" />
            </button>

            <div className="flex flex-col gap-4">
              <div className="hidden md:flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Dumbbell className="w-5 h-5 text-black" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">Gariba Gym</h1>
              </div>

              {/* Branch Selector */}
              <div className="relative">
                <button
                  onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-left group"
                >
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Sucursal Actual</span>
                    <span className="text-sm font-bold text-white truncate">
                      {selectedSucursal ? selectedSucursal.nombre : 'Cargando...'}
                    </span>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", isBranchMenuOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isBranchMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-2"
                    >
                      {sucursales.length === 0 ? (
                        <div className="px-4 py-2 text-xs text-gray-500 italic">No hay sucursales</div>
                      ) : (
                        sucursales.map(s => (
                          <button
                            key={s.id}
                            onClick={() => {
                              handleBranchChange(s.id, s.nombre);
                              setIsSidebarOpen(false);
                            }}
                            className={cn(
                              "w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-white/5 transition-colors",
                              selectedSucursalId === s.id ? "text-orange-500 bg-orange-500/5" : "text-gray-400"
                            )}
                          >
                            <MapPin className="w-4 h-4" />
                            <span className="font-medium">{s.nombre}</span>
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <nav className="flex flex-col gap-2">
              <NavButton 
                active={view === 'socios'} 
                onClick={() => { setView('socios'); setIsSidebarOpen(false); }} 
                icon={<LayoutDashboard className="w-5 h-5" />}
                label="Socios"
              />
              {hasPermission('pos_access') && (
                <NavButton 
                  active={view === 'pos'} 
                  onClick={() => { setView('pos'); setIsSidebarOpen(false); }} 
                  icon={<ShoppingCart className="w-5 h-5" />}
                  label="Punto de Venta"
                />
              )}
              <NavButton 
                active={view === 'checkin'} 
                onClick={() => { setView('checkin'); setIsSidebarOpen(false); }} 
                icon={<UserCheck className="w-5 h-5" />}
                label="Check-in"
              />
              {hasPermission('view_retention') && (
                <NavButton 
                  active={view === 'retencion'} 
                  onClick={() => { setView('retencion'); setIsSidebarOpen(false); }} 
                  icon={<BellRing className="w-5 h-5" />}
                  label="Retención"
                />
              )}
              {hasPermission('rutinas_access') && (
                <>
                  <NavButton 
                    active={view === 'rutinas'} 
                    onClick={() => { setView('rutinas'); setIsSidebarOpen(false); }} 
                    icon={<Dumbbell className="w-5 h-5" />}
                    label="Rutinas"
                  />
                  <NavButton 
                    active={view === 'catalogo_rutinas'} 
                    onClick={() => { setView('catalogo_rutinas'); setIsSidebarOpen(false); }} 
                    icon={<BookOpen className="w-5 h-5" />}
                    label="Catálogo"
                  />
                </>
              )}
              {hasPermission('view_retention') && (
                <NavButton 
                  active={view === 'whatsapp'} 
                  onClick={() => { setView('whatsapp'); setIsSidebarOpen(false); }} 
                  icon={<MessageSquare className="w-5 h-5" />}
                  label="WhatsApp"
                />
              )}
              {hasPermission('view_reports') && (
                <NavButton 
                  active={view === 'reportes'} 
                  onClick={() => { setView('reportes'); setIsSidebarOpen(false); }} 
                  icon={<BarChart3 className="w-5 h-5" />}
                  label="Reportes"
                />
              )}
              {hasPermission('manage_inventory') && (
                <NavButton 
                  active={view === 'inventario'} 
                  onClick={() => { setView('inventario'); setIsSidebarOpen(false); }} 
                  icon={<Package className="w-5 h-5" />}
                  label="Inventario"
                />
              )}
              {hasPermission('manage_branches') && (
                <NavButton 
                  active={view === 'sucursales'} 
                  onClick={() => { setView('sucursales'); setIsSidebarOpen(false); }} 
                  icon={<Settings className="w-5 h-5" />}
                  label="Sucursales"
                />
              )}
              {hasPermission('manage_staff') && (
                <NavButton 
                  active={view === 'staff'} 
                  onClick={() => { setView('staff'); setIsSidebarOpen(false); }} 
                  icon={<Users className="w-5 h-5" />}
                  label="Staff"
                />
              )}
            </nav>

            <div className="mt-auto pt-6 border-t border-white/5">
              <button
                onClick={() => { onSwitchToSocio(); setIsSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 mb-4 bg-lime-500/10 border border-lime-500/20 text-lime-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-lime-500/20 transition-all active:scale-95"
              >
                <UserCheck className="w-4 h-4" />
                Simular App Socio
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                  <span className="text-xs font-bold text-orange-500">{user.displayName?.charAt(0)}</span>
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-medium text-gray-300 truncate">{user.displayName}</span>
                  <span className="text-[10px] text-gray-500 truncate">{user.email}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[105] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto relative h-[calc(100vh-64px)] md:h-screen">
        {/* Fixed Simulation Button for Desktop */}
        <button
          onClick={onSwitchToSocio}
          className="hidden md:flex fixed top-6 right-8 z-50 items-center gap-2 px-4 py-2 bg-lime-500 text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-lime-400 transition-all active:scale-95 shadow-lg shadow-lime-500/20"
        >
          <UserCheck className="w-4 h-4" />
          Simular App de Socio
        </button>

        <div className="max-w-7xl mx-auto h-full">
          {view === 'socios' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={`socios-view-${selectedSucursalId}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-bold">Gestión de Socios</h2>
                  <p className="text-gray-500 text-sm mt-1">Sucursal: {selectedSucursal?.nombre || '...'}</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-black font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20"
                >
                  <Plus className="w-5 h-5" />
                  Agregar Socio
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard 
                  title="Total Socios" 
                  value={socios.length} 
                  icon={<Users className="w-5 h-5 text-blue-400" />} 
                  color="blue"
                />
                <StatCard 
                  title="Membresías Activas" 
                  value={activeCount} 
                  icon={<CheckCircle2 className="w-5 h-5 text-green-400" />} 
                  color="green"
                />
                <StatCard 
                  title="Membresías Vencidas" 
                  value={expiredCount} 
                  icon={<XCircle className="w-5 h-5 text-red-400" />} 
                  color="red"
                />
                {hasPermission('view_cash_cut') && (
                  <StatCard 
                    title="Corte Diario" 
                    value={`$${ventasHoy}`} 
                    icon={<Wallet className="w-5 h-5 text-orange-400" />} 
                    color="orange"
                  />
                )}
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar socio por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#111] border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-orange-500/50 transition-colors text-sm"
                />
              </div>

              {/* Table */}
              <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="max-h-[60vh] overflow-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-bottom border-white/5 bg-[#1a1a1a]">
                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Nombre</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Estado</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Días Restantes</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Vencimiento</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                              <span className="text-gray-500 text-sm">Cargando datos...</span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredSocios.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm">
                            No se encontraron socios registrados.
                          </td>
                        </tr>
                      ) : (
                        filteredSocios.map((socio) => {
                          const daysLeft = differenceInDays(new Date(socio.fecha_vencimiento), new Date());
                          const isExpired = !isAfter(new Date(socio.fecha_vencimiento), new Date());
                          const effectiveStatus = socio.estado === 'Baneado' ? 'Baneado' : isExpired ? 'Vencida' : socio.estado;
                          
                          return (
                            <motion.tr 
                              layout
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              key={socio.id} 
                              className="hover:bg-white/[0.02] transition-colors group"
                            >
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-200">{socio.nombre}</span>
                                  <span className="text-xs text-gray-500">{socio.email || 'Sin correo'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                                  effectiveStatus === 'Activa' 
                                    ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                                )}>
                                  {effectiveStatus === 'Activa' ? <CheckCircle2 className="w-3 h-3" /> : effectiveStatus === 'Baneado' ? <Ban className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                  {effectiveStatus}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <Clock className={cn(
                                    "w-4 h-4",
                                    daysLeft <= 5 ? "text-orange-400" : "text-gray-500"
                                  )} />
                                  <span className={cn(
                                    "text-sm font-mono",
                                    isExpired ? "text-red-400" : daysLeft <= 5 ? "text-orange-400" : "text-gray-300"
                                  )}>
                                    {isExpired ? 'Vencido' : `${daysLeft} días`}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-400">
                                {format(new Date(socio.fecha_vencimiento), 'dd/MM/yyyy')}
                              </td>
                              <td className="px-6 py-4">
                                <button 
                                  onClick={() => setAdminSocio(socio)}
                                  className="p-2 bg-white/5 hover:bg-white/10 text-orange-500 rounded-xl transition-all active:scale-95 border border-white/10"
                                  title="Administrar Socio"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              </td>
                            </motion.tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : view === 'pos' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={`pos-view-${selectedSucursalId}`}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Punto de Venta</h2>
                {hasPermission('view_cash_cut') && (
                  <div className="bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-xl flex items-center gap-3">
                    <Wallet className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-bold uppercase tracking-widest text-orange-500">Corte Hoy: ${ventasHoy}</span>
                  </div>
                )}
              </div>
              <POS 
                user={user} 
                sucursalId={selectedSucursalId} 
                selectedSocio={selectedSocioForRenewal}
                onClearSocio={() => setSelectedSocioForRenewal(null)}
              />
            </motion.div>
          ) : view === 'retencion' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={`retencion-view-${selectedSucursalId}`}
            >
              <RetentionView socios={socios} sucursalId={selectedSucursalId} />
            </motion.div>
          ) : view === 'rutinas' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={`rutinas-view-${selectedSucursalId}`}
            >
              <RutinasModule sucursalId={selectedSucursalId} />
            </motion.div>
          ) : view === 'catalogo_rutinas' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={`catalogo-view-${selectedSucursalId}`}
            >
              <CatalogoRutinasModule />
            </motion.div>
          ) : view === 'whatsapp' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={`whatsapp-view-${selectedSucursalId}`}
            >
              <WhatsAppModule socios={socios} sucursalId={selectedSucursalId} />
            </motion.div>
          ) : view === 'reportes' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={`reportes-view-${selectedSucursalId}`}
            >
              <ReportsModule sucursalId={selectedSucursalId} />
            </motion.div>
          ) : view === 'inventario' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={`inventario-view-${selectedSucursalId}`}
            >
              <InventarioModule canManage={hasPermission('manage_inventory')} />
            </motion.div>
          ) : view === 'sucursales' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key="sucursales-view"
            >
              <ConfiguracionModule canManage={hasPermission('manage_branches')} />
            </motion.div>
          ) : view === 'staff' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key="staff-view"
            >
              <StaffModule />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={`checkin-view-${selectedSucursalId}`}
              className="h-full"
            >
              <CheckIn sucursalId={selectedSucursalId} />
            </motion.div>
          )}
        </div>
      </main>

      <Toaster position="top-right" theme="dark" richColors />
      <AnimatePresence>
        {adminSocio && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAdminSocio(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h3 className="text-xl font-bold text-white">Administrar: {adminSocio.nombre}</h3>
                <button 
                  onClick={() => setAdminSocio(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <XCircle className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              
              <div className="p-8 flex flex-col gap-4">
                {hasPermission('pos_access') && (
                  <button
                    onClick={() => {
                      setSelectedSocioForRenewal(adminSocio);
                      setView('pos');
                      setAdminSocio(null);
                      setIsSidebarOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-black font-bold py-4 rounded-2xl transition-all shadow-lg shadow-green-500/20"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Renovar Membresía (Ir a POS)
                  </button>
                )}

                {hasPermission('edit_socio') && (
                  <button
                    onClick={() => {
                      setEditingSocio(adminSocio);
                      setAdminSocio(null);
                    }}
                    className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-2xl transition-all border border-white/10"
                  >
                    <Edit3 className="w-5 h-5 text-orange-500" />
                    Editar Datos
                  </button>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setViewingSocio(adminSocio);
                      setAdminSocio(null);
                    }}
                    className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 py-3 rounded-xl transition-all text-sm"
                  >
                    <UserCircle className="w-4 h-4 text-purple-500" />
                    Ver Perfil
                  </button>
                </div>

                {hasPermission('edit_socio') && (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        setPenalizingSocio(adminSocio);
                        setAdminSocio(null);
                      }}
                      className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 py-3 rounded-xl transition-all text-sm"
                    >
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                      Penalizar
                    </button>
                    <button
                      onClick={() => {
                        setResettingSocioPassword(adminSocio);
                        setAdminSocio(null);
                      }}
                      className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 py-3 rounded-xl transition-all text-sm"
                    >
                      <LockIcon className="w-4 h-4 text-lime-500" />
                      Reset Pass
                    </button>
                  </div>
                )}

                <div className="pt-4 mt-4 border-t border-white/5">
                  {hasPermission('delete_socio') && (
                    <button
                      onClick={() => {
                        setDeletingSocio(adminSocio);
                        setAdminSocio(null);
                      }}
                      className="w-full flex items-center justify-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-4 rounded-2xl transition-all border border-red-500/20"
                    >
                      <Trash2 className="w-5 h-5" />
                      Eliminar Socio
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {isModalOpen && (
          <AddSocioModal 
            onClose={() => setIsModalOpen(false)} 
            user={user}
            sucursalId={selectedSucursalId}
          />
        )}
        {editingSocio && (
          <EditSocioModal
            socio={editingSocio}
            sucursales={sucursales}
            onClose={() => setEditingSocio(null)}
          />
        )}
        {viewingSocio && (
          <SocioProfileModal
            socio={viewingSocio}
            onClose={() => setViewingSocio(null)}
          />
        )}
        {penalizingSocio && (
          <PenalizeSocioModal
            socio={penalizingSocio}
            onClose={() => setPenalizingSocio(null)}
          />
        )}
        {renewingSocio && (
          <RenewMembershipModal
            socio={renewingSocio}
            onClose={() => setRenewingSocio(null)}
          />
        )}
        {resettingSocioPassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setResettingSocioPassword(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl shadow-2xl p-8"
            >
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-lime-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <LockIcon className="w-6 h-6 text-lime-500" />
                </div>
                <h3 className="text-xl font-bold text-white">Resetear Contraseña Socio</h3>
                <p className="text-xs text-gray-500 mt-1">Para: {resettingSocioPassword.nombre}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Nueva Contraseña</label>
                  <input
                    type="password"
                    value={newSocioPassword}
                    onChange={(e) => setNewSocioPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-lime-500/50 transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setResettingSocioPassword(null)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (newSocioPassword.length < 6) {
                        toast.error('La contraseña debe tener al menos 6 caracteres');
                        return;
                      }
                      try {
                        await updateDoc(doc(db, 'socios', resettingSocioPassword.id), {
                          password: newSocioPassword,
                          mustChangePassword: true
                        });
                        toast.success('Contraseña reseteada correctamente');
                        setResettingSocioPassword(null);
                        setNewSocioPassword('');
                      } catch (error) {
                        toast.error('Error al resetear contraseña');
                      }
                    }}
                    className="flex-1 bg-lime-500 hover:bg-lime-600 text-black font-bold py-3 rounded-2xl transition-all shadow-lg shadow-lime-500/20"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {deletingSocio && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingSocio(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-[#111] border border-red-500/20 rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">¿Estás seguro?</h3>
              <p className="text-gray-500 text-sm mb-8">
                Esta acción eliminará permanentemente a <strong>{deletingSocio.nombre}</strong> del sistema.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingSocio(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    try {
                      await deleteDoc(doc(db, 'socios', deletingSocio.id));
                      toast.success('Socio eliminado correctamente');
                      setDeletingSocio(null);
                    } catch (error) {
                      toast.error('Error al eliminar socio');
                    }
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-red-500/20"
                >
                  Eliminar
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
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-orange-500/10 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <ShieldCheck className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Aviso Legal</h3>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Revisión Obligatoria para Staff</p>
                  </div>
                </div>
              </div>

              <div className="flex border-b border-white/5 bg-black/20">
                <button
                  onClick={() => setLegalTab('terms')}
                  className={cn(
                    "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                    legalTab === 'terms' ? "border-orange-500 text-orange-500 bg-orange-500/5" : "border-transparent text-gray-500 hover:text-white"
                  )}
                >
                  Términos y Condiciones
                </button>
                <button
                  onClick={() => setLegalTab('privacy')}
                  className={cn(
                    "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                    legalTab === 'privacy' ? "border-orange-500 text-orange-500 bg-orange-500/5" : "border-transparent text-gray-500 hover:text-white"
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
                  className="w-full bg-orange-500 hover:bg-orange-600 text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-orange-500/20 uppercase tracking-widest"
                >
                  Aceptar y Continuar
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Toaster position="top-center" richColors />
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm",
        active 
          ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
          : "text-gray-500 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: 'blue' | 'green' | 'red' | 'orange' }) {
  const colors = {
    blue: "from-blue-500/20 to-transparent border-blue-500/30",
    green: "from-green-500/20 to-transparent border-green-500/30",
    red: "from-red-500/20 to-transparent border-red-500/30",
    orange: "from-orange-500/20 to-transparent border-orange-500/30",
  };

  return (
    <div className={cn(
      "bg-gradient-to-br border p-6 rounded-2xl relative overflow-hidden group transition-all hover:scale-[1.02]",
      colors[color]
    )}>
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white">{value}</h3>
        </div>
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          {icon}
        </div>
      </div>
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />
    </div>
  );
}
