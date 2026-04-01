import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { 
  Dumbbell, 
  Plus, 
  Trash2, 
  Save, 
  User, 
  Calendar, 
  Play, 
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  XCircle,
  X,
  Edit3
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  Timestamp, 
  deleteDoc, 
  doc, 
  orderBy,
  where
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Ejercicio, PlantillaRutina } from '../types';
import { toast } from 'sonner';

interface Exercise {
  ejercicioId: string;
  nombre: string;
  series: string;
  repeticiones: string;
  descanso: string;
  observaciones: string;
  rpe?: string;
  tempo?: string;
  tipo?: 'Normal' | 'Superset' | 'Dropset' | 'Circuito';
  videoUrl?: string;
  notas?: string;
}

interface DiaRutina {
  nombre: string;
  ejercicios: Exercise[];
  notas?: string;
}

interface Routine {
  id: string;
  socioId: string;
  nombreSocio: string;
  dias: DiaRutina[];
  fechaCreacion: Timestamp;
  uid: string;
  sucursalId: string;
}

interface RoutineRequest {
  id: string;
  socioId: string;
  nombreSocio: string;
  emailSocio: string;
  fechaSolicitud: Timestamp;
  estado: 'Pendiente' | 'Atendida';
  mensaje: string;
  sucursalId: string;
}

interface Socio {
  id: string;
  nombre: string;
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function RutinasModule({ sucursalId }: { sucursalId: string }) {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [rutinas, setRutinas] = useState<Routine[]>([]);
  const [solicitudes, setSolicitudes] = useState<RoutineRequest[]>([]);
  const [catalogEjercicios, setCatalogEjercicios] = useState<Ejercicio[]>([]);
  const [catalogPlantillas, setCatalogPlantillas] = useState<PlantillaRutina[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'rutinas' | 'solicitudes'>('rutinas');
  
  // Form State
  const [selectedSocio, setSelectedSocio] = useState<string>('');
  const [routineDays, setRoutineDays] = useState<DiaRutina[]>([
    { nombre: 'Día 1', ejercicios: [] }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExerciseCatalog, setShowExerciseCatalog] = useState(false);
  const [showTemplateCatalog, setShowTemplateCatalog] = useState(false);
  const [addingExerciseToDay, setAddingExerciseToDay] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('Todos');

  const filteredExercises = (catalogEjercicios || []).filter(ex => {
    const matchesSearch = (ex.nombre || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    const matchesMuscle = selectedMuscle === 'Todos' || ex.musculo === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  const muscles = ['Todos', ...new Set((catalogEjercicios || []).map(ex => ex.musculo || 'Otros'))];

  const handleSaveAsTemplate = async () => {
    if (!(routineDays?.length || 0)) {
      toast.error("Añade al menos un día");
      return;
    }

    try {
      await addDoc(collection(db, 'plantillas_rutinas'), {
        name: `Plantilla - ${(socios || []).find(s => s.id === selectedSocio)?.nombre || 'Nueva'}`,
        description: `Creada desde el módulo de rutinas`,
        icon: 'Dumbbell',
        dias: routineDays,
        fechaCreacion: Timestamp.now(),
        sucursalId
      });
      toast.success("Rutina guardada como plantilla");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'plantillas_rutinas');
      toast.error("Error al guardar la plantilla");
    }
  };

  useEffect(() => {
    const unsubEjercicios = onSnapshot(collection(db, 'ejercicios'), (snapshot) => {
      setCatalogEjercicios(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ejercicio)));
    });
    const unsubPlantillas = onSnapshot(collection(db, 'plantillas_rutinas'), (snapshot) => {
      setCatalogPlantillas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlantillaRutina)));
    });
    const qSocios = query(
      collection(db, 'socios'), 
      where('sucursalId', '==', sucursalId)
    );
    const unsubscribeSocios = onSnapshot(qSocios, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        nombre: doc.data().nombre
      })) as Socio[];
      setSocios(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'socios');
    });

    const qRutinas = query(collection(db, 'rutinas'));
    const unsubscribeRutinas = onSnapshot(qRutinas, (snapshot) => {
      const allRutinas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Routine[];
      
      // Filter by branch, including legacy data in the first branch if needed
      // But for simplicity and correctness, we'll just filter by sucursalId
      // and maybe show all if sucursalId is not provided (though it is)
      const filtered = allRutinas.filter(r => {
        if (!r.sucursalId) return true; // Show legacy routines to all for now, or assign to first branch
        return r.sucursalId === sucursalId;
      });

      // Sort in memory
      filtered.sort((a, b) => {
        const dateA = a.fechaCreacion?.toMillis() || 0;
        const dateB = b.fechaCreacion?.toMillis() || 0;
        return dateB - dateA;
      });

      setRutinas(filtered);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'rutinas');
      setLoading(false);
    });

    const qSolicitudes = query(collection(db, 'solicitudes_rutina'));
    const unsubscribeSolicitudes = onSnapshot(qSolicitudes, (snapshot) => {
      const allSolicitudes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RoutineRequest[];

      const filtered = allSolicitudes.filter(s => {
        if (!s.sucursalId) return true;
        return s.sucursalId === sucursalId;
      });

      // Sort
      filtered.sort((a, b) => {
        const dateA = a.fechaSolicitud?.toMillis() || 0;
        const dateB = b.fechaSolicitud?.toMillis() || 0;
        return dateB - dateA;
      });

      setSolicitudes(filtered);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'solicitudes_rutina');
      setLoading(false);
    });

    return () => {
      unsubscribeSocios();
      unsubscribeRutinas();
      unsubscribeSolicitudes();
      unsubEjercicios();
      unsubPlantillas();
    };
  }, [sucursalId]);

  const handleAtenderSolicitud = async (solicitud: RoutineRequest) => {
    setSelectedSocio(solicitud.socioId);
    setShowForm(true);
    setActiveTab('rutinas');
    // Optionally update status to 'Atendida' after saving
  };

  const handleDeleteSolicitud = async (id: string) => {
    if (!confirm("¿Eliminar solicitud?")) return;
    try {
      await deleteDoc(doc(db, 'solicitudes_rutina', id));
      toast.success("Solicitud eliminada");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `solicitudes_rutina/${id}`);
    }
  };

  const handleApplyTemplate = (template: PlantillaRutina) => {
    setRoutineDays((template.dias || []).map(dia => ({
      nombre: dia.nombre || '',
      ejercicios: (dia.ejercicios || []).map(ex => ({
        ...ex,
        videoUrl: (catalogEjercicios || []).find(ce => ce.id === ex.ejercicioId)?.videoUrl || ''
      }))
    })));
    toast.success(`Plantilla "${template.name}" aplicada`);
  };

  const handleSave = async () => {
    if (!selectedSocio || (routineDays?.length || 0) === 0) {
      toast.error('Por favor selecciona un socio y añade al menos un día');
      return;
    }

    const hasExercises = (routineDays || []).some(dia => (dia.ejercicios?.length || 0) > 0);
    if (!hasExercises) {
      toast.error('La rutina debe tener al menos un ejercicio');
      return;
    }

    setIsSaving(true);
    try {
      const socio = (socios || []).find(s => s.id === selectedSocio);
      const routineData = {
        socioId: selectedSocio,
        nombreSocio: socio?.nombre || 'Desconocido',
        dias: routineDays,
        fechaCreacion: Timestamp.now(),
        uid: auth.currentUser?.uid,
        sucursalId
      };

      await addDoc(collection(db, 'rutinas'), routineData);
      
      toast.success('Rutina guardada correctamente');
      
      // Reset form
      setSelectedSocio('');
      setRoutineDays([{ nombre: 'Día 1', ejercicios: [] }]);
      setShowForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rutinas');
      console.error("Error saving routine:", error);
      toast.error('Error al guardar la rutina');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadTemplate = (template: PlantillaRutina) => {
    if (window.confirm('¿Cargar esta plantilla? Se perderán los cambios actuales.')) {
      setRoutineDays(template.dias || []);
      setShowTemplateCatalog(false);
      toast.success(`Plantilla "${template.name}" cargada`);
    }
  };

  const handleCopyDay = (index: number) => {
    const dayToCopy = routineDays[index];
    const newDay = {
      ...dayToCopy,
      nombre: `${dayToCopy.nombre} (Copia)`
    };
    setRoutineDays([...routineDays, newDay]);
    toast.success('Día copiado');
  };
  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta rutina?')) {
      try {
        await deleteDoc(doc(db, 'rutinas', id));
        toast.success('Rutina eliminada');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `rutinas/${id}`);
        toast.error('Error al eliminar la rutina');
      }
    }
  };

  const filteredRutinas = rutinas.filter(r => 
    (r.nombreSocio?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (r.dias || []).some(d => (d.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase">Creador de Rutinas</h2>
          <p className="text-gray-500 text-sm">Gestiona los planes de entrenamiento personalizados.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex items-center gap-1">
            <button
              onClick={() => setActiveTab('rutinas')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                activeTab === 'rutinas' ? "bg-lime-500 text-black shadow-lg shadow-lime-500/20" : "text-gray-500 hover:text-white"
              )}
            >
              Rutinas
            </button>
            <button
              onClick={() => setActiveTab('solicitudes')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                activeTab === 'solicitudes' ? "bg-lime-500 text-black shadow-lg shadow-lime-500/20" : "text-gray-500 hover:text-white"
              )}
            >
              Solicitudes
              {(solicitudes || []).filter(s => s.estado === 'Pendiente').length > 0 && (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all",
              showForm 
                ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                : "bg-lime-500 text-black shadow-lg shadow-lime-500/20 hover:scale-105"
            )}
          >
            {showForm ? <Trash2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {showForm ? "Cancelar" : "Nueva Rutina"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#111] border border-white/10 rounded-3xl p-6 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Config */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                      <User className="w-3 h-3" /> Socio
                    </label>
                    <select 
                      value={selectedSocio}
                      onChange={(e) => setSelectedSocio(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-lime-500 outline-none transition-colors"
                    >
                      <option value="">Seleccionar Socio...</option>
                      {(socios || []).map(s => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                      <Dumbbell className="w-3 h-3" /> Usar Plantilla
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2 scrollbar-hide">
                      {(catalogPlantillas || []).map(plantilla => (
                        <button
                          key={plantilla.id}
                          onClick={() => handleApplyTemplate(plantilla)}
                          className="p-3 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-all group"
                        >
                          <p className="text-xs font-bold text-white group-hover:text-lime-500">{plantilla.name}</p>
                          <p className="text-[10px] text-gray-500 line-clamp-1">{plantilla.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveAsTemplate}
                      className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-tighter text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" /> Plantilla
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-[2] bg-lime-500 text-black py-4 rounded-2xl font-black uppercase tracking-tighter flex items-center justify-center gap-2 hover:bg-lime-400 transition-all disabled:opacity-50"
                    >
                      {isSaving ? (
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Guardar Rutina
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right Column: Days and Exercises */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Estructura de la Rutina</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowTemplateCatalog(true)}
                        className="text-orange-500 text-xs font-bold flex items-center gap-1 hover:underline"
                      >
                        <FileText className="w-3 h-3" />
                        Cargar Plantilla
                      </button>
                      <button
                        onClick={() => setRoutineDays([...routineDays, { nombre: `Día ${routineDays.length + 1}`, ejercicios: [] }])}
                        className="text-lime-500 text-xs font-bold flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3 h-3" />
                        Añadir Día
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {(routineDays || []).map((dia, diaIndex) => (
                      <div key={diaIndex} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-8 h-8 bg-lime-500/10 rounded-lg flex items-center justify-center text-lime-500 font-bold text-xs">
                              {diaIndex + 1}
                            </div>
                            <input
                              value={dia.nombre}
                              onChange={(e) => {
                                const updated = [...(routineDays || [])];
                                if (updated[diaIndex]) {
                                  updated[diaIndex].nombre = e.target.value;
                                  setRoutineDays(updated);
                                }
                              }}
                              placeholder="Nombre del día (ej: Empuje, Lunes...)"
                              className="bg-transparent border-b border-white/10 py-1 text-sm font-bold text-white focus:border-lime-500 outline-none flex-1"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopyDay(diaIndex)}
                              className="p-2 text-lime-500/50 hover:text-lime-500 hover:bg-lime-500/10 rounded-xl transition-all"
                              title="Copiar Día"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setRoutineDays((routineDays || []).filter((_, i) => i !== diaIndex))}
                              className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Notas del Día (Opcional)</label>
                          <textarea
                            value={dia.notas || ''}
                            onChange={(e) => {
                              const updated = [...(routineDays || [])];
                              if (updated[diaIndex]) {
                                updated[diaIndex].notas = e.target.value;
                                setRoutineDays(updated);
                              }
                            }}
                            placeholder="Ej: Calentamiento específico, enfoque en técnica..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-lime-500 min-h-[40px] resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          {(dia.ejercicios || []).map((ex, exIndex) => (
                            <div key={exIndex} className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-4 relative group">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <input
                                    value={ex.nombre}
                                    onChange={(e) => {
                                      const updated = [...(routineDays || [])];
                                      if (updated[diaIndex]?.ejercicios?.[exIndex]) {
                                        updated[diaIndex].ejercicios[exIndex].nombre = e.target.value;
                                        setRoutineDays(updated);
                                      }
                                    }}
                                    placeholder="Nombre del ejercicio"
                                    className="bg-transparent border-b border-white/10 py-1 text-sm font-bold text-white focus:border-lime-500 outline-none w-full"
                                  />
                                </div>
                                <button
                                  onClick={() => {
                                    const updated = [...routineDays];
                                    updated[diaIndex].ejercicios = (updated[diaIndex].ejercicios || []).filter((_, i) => i !== exIndex);
                                    setRoutineDays(updated);
                                  }}
                                  className="p-1.5 text-gray-600 hover:text-red-500 transition-all"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Series</label>
                                  <input
                                    value={ex.series}
                                    onChange={(e) => {
                                      const updated = [...(routineDays || [])];
                                      if (updated[diaIndex]?.ejercicios?.[exIndex]) {
                                        updated[diaIndex].ejercicios[exIndex].series = e.target.value;
                                        setRoutineDays(updated);
                                      }
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-lime-500"
                                    placeholder="3"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Reps</label>
                                  <input
                                    value={ex.repeticiones}
                                    onChange={(e) => {
                                      const updated = [...(routineDays || [])];
                                      if (updated[diaIndex]?.ejercicios?.[exIndex]) {
                                        updated[diaIndex].ejercicios[exIndex].repeticiones = e.target.value;
                                        setRoutineDays(updated);
                                      }
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-lime-500"
                                    placeholder="12"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">RPE / Int.</label>
                                  <input
                                    value={ex.rpe || ''}
                                    onChange={(e) => {
                                      const updated = [...(routineDays || [])];
                                      if (updated[diaIndex]?.ejercicios?.[exIndex]) {
                                        updated[diaIndex].ejercicios[exIndex].rpe = e.target.value;
                                        setRoutineDays(updated);
                                      }
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-lime-500"
                                    placeholder="8"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Descanso</label>
                                  <input
                                    value={ex.descanso}
                                    onChange={(e) => {
                                      const updated = [...(routineDays || [])];
                                      if (updated[diaIndex]?.ejercicios?.[exIndex]) {
                                        updated[diaIndex].ejercicios[exIndex].descanso = e.target.value;
                                        setRoutineDays(updated);
                                      }
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-lime-500"
                                    placeholder="90s"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Tempo</label>
                                  <input
                                    value={ex.tempo || ''}
                                    onChange={(e) => {
                                      const updated = [...(routineDays || [])];
                                      if (updated[diaIndex]?.ejercicios?.[exIndex]) {
                                        updated[diaIndex].ejercicios[exIndex].tempo = e.target.value;
                                        setRoutineDays(updated);
                                      }
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-lime-500"
                                    placeholder="3-0-1-0"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Tipo</label>
                                  <select
                                    value={ex.tipo || 'Normal'}
                                    onChange={(e) => {
                                      const updated = [...(routineDays || [])];
                                      if (updated[diaIndex]?.ejercicios?.[exIndex]) {
                                        updated[diaIndex].ejercicios[exIndex].tipo = e.target.value as any;
                                        setRoutineDays(updated);
                                      }
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-lime-500"
                                  >
                                    <option value="Normal">Normal</option>
                                    <option value="Superset">Superset</option>
                                    <option value="Dropset">Dropset</option>
                                    <option value="Circuito">Circuito</option>
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Observaciones</label>
                                <textarea
                                  value={ex.observaciones}
                                  onChange={(e) => {
                                    const updated = [...(routineDays || [])];
                                    if (updated[diaIndex]?.ejercicios?.[exIndex]) {
                                      updated[diaIndex].ejercicios[exIndex].observaciones = e.target.value;
                                      setRoutineDays(updated);
                                    }
                                  }}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-lime-500 min-h-[60px] resize-none"
                                  placeholder="Detalles adicionales..."
                                />
                              </div>
                            </div>
                          ))}

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setAddingExerciseToDay(diaIndex);
                                setShowExerciseCatalog(true);
                              }}
                              className="flex-1 py-3 border border-dashed border-white/20 rounded-2xl text-xs font-bold text-gray-500 hover:text-lime-500 hover:border-lime-500/50 transition-all flex items-center justify-center gap-2 bg-white/[0.02]"
                            >
                              <Plus className="w-4 h-4" /> Añadir del Catálogo
                            </button>
                            <button
                              onClick={() => {
                                const updated = [...routineDays];
                                updated[diaIndex].ejercicios.push({
                                  ejercicioId: 'manual',
                                  nombre: '',
                                  series: '3',
                                  repeticiones: '12',
                                  descanso: '60s',
                                  observaciones: '',
                                  tipo: 'Normal'
                                });
                                setRoutineDays(updated);
                              }}
                              className="px-4 border border-dashed border-white/20 rounded-2xl text-xs font-bold text-gray-500 hover:text-white transition-all flex items-center justify-center bg-white/[0.02]"
                              title="Añadir Manualmente"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => setRoutineDays([...routineDays, { nombre: `Día ${routineDays.length + 1}`, ejercicios: [] }])}
                      className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" /> Añadir Nuevo Día
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'rutinas' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="font-bold flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-lime-500" />
              Rutinas Guardadas
            </h3>
            <div className="relative w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                placeholder="Buscar por socio o día..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#111] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs focus:border-lime-500 outline-none transition-colors w-full sm:w-64"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-[#111] animate-pulse rounded-3xl border border-white/5" />
              ))}
            </div>
          ) : (filteredRutinas || []).length === 0 ? (
            <div className="bg-[#111] border border-white/10 rounded-3xl p-12 text-center">
              <Dumbbell className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No se encontraron rutinas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(filteredRutinas || []).map((rutina) => (
                <motion.div 
                  layout
                  key={rutina.id}
                  className="bg-[#111] border border-white/10 rounded-3xl p-6 hover:border-lime-500/30 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg leading-tight">{rutina.nombreSocio}</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(rutina.dias || []).map((dia, dIdx) => (
                          <span key={dIdx} className="text-[10px] font-black uppercase tracking-widest bg-lime-500/10 text-lime-500 px-2 py-0.5 rounded-md border border-lime-500/20">
                            {dia.nombre}
                          </span>
                        ))}
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-1 self-center">
                          {(rutina.dias || []).reduce((acc, d) => acc + (d.ejercicios?.length || 0), 0)} Ejercicios
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(rutina.id)}
                      className="p-2 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4 mt-6">
                    {(rutina.dias || []).slice(0, 1).map((dia, dIdx) => (
                      <div key={dIdx} className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{dia.nombre}</p>
                        {(dia.ejercicios || []).slice(0, 3).map((ex, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                              <span className="text-gray-300">{ex.nombre}</span>
                            </div>
                            <span className="text-gray-500 font-mono">{ex.series}x{ex.repeticiones}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    {(rutina.dias?.length || 0) > 1 && (
                      <p className="text-[10px] text-gray-600 italic">+{(rutina.dias?.length || 0) - 1} días más...</p>
                    )}
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <Clock className="w-3 h-3" />
                      {rutina.fechaCreacion?.toDate().toLocaleDateString() || 'Fecha desconocida'}
                    </div>
                    {(rutina.dias || []).some(d => (d.ejercicios || []).some(e => e.videoUrl)) && (
                      <div className="flex items-center gap-1 text-[10px] text-lime-500 font-bold">
                        <Play className="w-3 h-3" /> VIDEO
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Solicitudes de Rutina
          </h3>
          
          {(solicitudes || []).length === 0 ? (
            <div className="bg-[#111] border border-white/10 rounded-3xl p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No hay solicitudes pendientes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(solicitudes || []).map((solicitud) => (
                <motion.div 
                  key={solicitud.id}
                  className="bg-[#111] border border-white/10 rounded-3xl p-6 space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white">{solicitud.nombreSocio}</h4>
                      <p className="text-xs text-gray-500">{solicitud.emailSocio}</p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase px-2 py-1 rounded-md",
                      solicitud.estado === 'Pendiente' ? "bg-orange-500/10 text-orange-500" : "bg-green-500/10 text-green-500"
                    )}>
                      {solicitud.estado}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 bg-white/5 p-3 rounded-xl italic">"{solicitud.mensaje}"</p>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-[10px] text-gray-600">
                      {solicitud.fechaSolicitud && typeof solicitud.fechaSolicitud.toDate === 'function' 
                        ? solicitud.fechaSolicitud.toDate().toLocaleString() 
                        : 'Fecha desconocida'}
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAtenderSolicitud(solicitud)}
                        className="p-2 bg-lime-500/10 text-lime-500 rounded-lg hover:bg-lime-500 hover:text-black transition-all"
                        title="Atender"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteSolicitud(solicitud.id)}
                        className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Template Catalog Modal */}
      <AnimatePresence>
        {showTemplateCatalog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0A0A0A] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Plantillas de Rutinas</h3>
                  <p className="text-xs text-gray-500">Selecciona una plantilla para cargar</p>
                </div>
                <button
                  onClick={() => setShowTemplateCatalog(false)}
                  className="p-2 hover:bg-white/5 rounded-xl text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catalogPlantillas.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleLoadTemplate(template)}
                      className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left hover:border-orange-500/50 transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{template.name}</h4>
                          <p className="text-[10px] text-gray-500">{(template.dias?.length || 0)} Días</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 line-clamp-2">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showExerciseCatalog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0A0A0A] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Catálogo de Ejercicios</h3>
                  <p className="text-xs text-gray-500">Selecciona un ejercicio para añadir al día</p>
                </div>
                <button
                  onClick={() => setShowExerciseCatalog(false)}
                  className="p-2 hover:bg-white/5 rounded-xl text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar ejercicio..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-lime-500"
                    />
                  </div>
                  <select
                    value={selectedMuscle}
                    onChange={(e) => setSelectedMuscle(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-lime-500"
                  >
                    {(muscles || []).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                  <div className="grid grid-cols-1 gap-2">
                    {(filteredExercises || []).map((ex) => (
                      <button
                        key={ex.id}
                        onClick={() => {
                          if (addingExerciseToDay !== null) {
                            const updated = [...(routineDays || [])];
                            if (!updated[addingExerciseToDay].ejercicios) updated[addingExerciseToDay].ejercicios = [];
                            updated[addingExerciseToDay].ejercicios.push({
                              ejercicioId: ex.id!,
                              nombre: ex.nombre || '',
                              series: '3',
                              repeticiones: '12',
                              descanso: '60s',
                              observaciones: '',
                              videoUrl: ex.videoUrl,
                              tipo: 'Normal'
                            });
                            setRoutineDays(updated);
                            setShowExerciseCatalog(false);
                            setAddingExerciseToDay(null);
                          }
                        }}
                        className="flex items-center gap-4 p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-lime-500/10 hover:border-lime-500/30 transition-all group text-left"
                      >
                        <div className="w-12 h-12 bg-black rounded-xl overflow-hidden border border-white/10">
                          {ex.videoUrl ? (
                            <video src={ex.videoUrl} className="w-full h-full object-cover opacity-50 group-hover:opacity-100" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-700">
                              <Dumbbell className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-lime-500 transition-colors">{ex.nombre}</h4>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{ex.musculo}</p>
                        </div>
                        <Plus className="w-4 h-4 ml-auto text-gray-700 group-hover:text-lime-500" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
