import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  Dumbbell, 
  Zap, 
  Trophy, 
  Target, 
  ChevronRight,
  Plus,
  Play,
  Edit3,
  Trash2,
  X,
  Save,
  CalendarDays,
  Clock,
  List,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { handleSupabaseError, OperationType } from '../lib/supabaseHelpers';
import { EXERCISE_CATALOG, ROUTINE_TEMPLATES, getTemplateIcon } from '../constants/gymData';
import { Ejercicio, PlantillaRutina } from '../types';
import { toast } from 'sonner';

export default function CatalogoRutinasModule({ sucursalId }: { sucursalId: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'exercises' | 'templates'>('exercises');
  const [viewingTemplate, setViewingTemplate] = useState<PlantillaRutina | null>(null);
  
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [plantillas, setPlantillas] = useState<PlantillaRutina[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEjercicioModalOpen, setIsEjercicioModalOpen] = useState(false);
  const [editingEjercicio, setEditingEjercicio] = useState<Ejercicio | null>(null);
  const [newEjercicio, setNewEjercicio] = useState<Ejercicio>({
    nombre: '',
    musculo: 'Pecho',
    descripcion: '',
    videoUrl: '',
    equipamiento: 'Mancuernas',
    categoria: 'Fuerza'
  });

  const [isPlantillaModalOpen, setIsPlantillaModalOpen] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState<PlantillaRutina | null>(null);
  const [newPlantilla, setNewPlantilla] = useState<PlantillaRutina>({
    name: '',
    description: '',
    icon: 'Dumbbell',
    dias: [{ nombre: 'Día 1', ejercicios: [] }]
  });

  useEffect(() => {
    const fetchEjercicios = async () => {
      const { data, error } = await supabase
        .from('ejercicios')
        .select('*')
        .order('nombre');
      
      if (error) {
        handleSupabaseError(error, OperationType.READ, 'ejercicios');
      } else {
        if (data.length === 0 && loading) {
          // Seed initial data if empty
          for (const { videoUrl, ...rest } of EXERCISE_CATALOG) {
            await supabase.from('ejercicios').insert({ ...rest, video_url: videoUrl });
          }
          // Re-fetch after seeding
          const { data: seededData } = await supabase.from('ejercicios').select('*').order('nombre');
          setEjercicios(seededData || []);
        } else {
          setEjercicios(data || []);
        }
      }
    };

    const fetchPlantillas = async () => {
      const { data, error } = await supabase
        .from('plantillas_rutinas')
        .select('*')
        .eq('sucursal_id', sucursalId)
        .order('nombre');

      if (error) {
        handleSupabaseError(error, OperationType.READ, 'plantillas_rutinas');
      } else {
        if (data.length === 0 && loading) {
          // Seed initial data if empty
          for (const temp of ROUTINE_TEMPLATES) {
            await supabase.from('plantillas_rutinas').insert({
              nombre: temp.name,
              descripcion: temp.description,
              icon: temp.icon,
              sucursal_id: sucursalId
            });
          }
          // Re-fetch after seeding
          const { data: seededData } = await supabase
            .from('plantillas_rutinas')
            .select('*')
            .eq('sucursal_id', sucursalId)
            .order('nombre');
          setPlantillas(seededData || []);
        } else {
          setPlantillas(data || []);
        }
      }
      setLoading(false);
    };

    fetchEjercicios();
    fetchPlantillas();
  }, [sucursalId]);

  const muscles = Array.from(new Set((ejercicios || []).map(e => e.musculo || 'Otros')));

  const filteredExercises = (ejercicios || []).filter(e => {
    const matchesSearch = (e.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (e.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMuscle = !selectedMuscle || e.musculo === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  const handleSaveEjercicio = async () => {
    if (!newEjercicio.nombre || !newEjercicio.musculo) {
      toast.error('Nombre y músculo son obligatorios');
      return;
    }

    try {
      if (editingEjercicio?.id) {
        const { videoUrl, ...updateBody } = newEjercicio;
        const { error } = await supabase.from('ejercicios').update({ ...updateBody, video_url: videoUrl }).eq('id', editingEjercicio.id);
        if (error) throw error;
        toast.success('Ejercicio actualizado');
      } else {
        const { videoUrl, ...insertBody } = newEjercicio;
        const { error } = await supabase.from('ejercicios').insert({ ...insertBody, video_url: videoUrl });
        if (error) throw error;
        toast.success('Ejercicio creado');
      }
      setIsEjercicioModalOpen(false);
      setEditingEjercicio(null);
      setNewEjercicio({ 
        nombre: '', 
        musculo: 'Pecho', 
        descripcion: '', 
        videoUrl: '',
        equipamiento: 'Mancuernas',
        categoria: 'Fuerza'
      });
    } catch (error) {
      handleSupabaseError(error, editingEjercicio?.id ? OperationType.UPDATE : OperationType.CREATE, 'ejercicios');
      toast.error('Error al guardar ejercicio');
    }
  };

  const handleDeleteEjercicio = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este ejercicio?')) return;
    try {
      const { error } = await supabase.from('ejercicios').delete().eq('id', id);
      if (error) throw error;
      toast.success('Ejercicio eliminado');
    } catch (error) {
      handleSupabaseError(error, OperationType.DELETE, `ejercicios/${id}`);
      toast.error('Error al eliminar ejercicio');
    }
  };

  const handleSavePlantilla = async () => {
    if (!newPlantilla.name || (newPlantilla.dias || []).length === 0) {
      toast.error('Nombre y al menos un día son obligatorios');
      return;
    }

    const hasExercises = (newPlantilla.dias || []).some(dia => (dia.ejercicios || []).length > 0);
    if (!hasExercises) {
      toast.error('La plantilla debe tener al menos un ejercicio');
      return;
    }

    try {
      if (editingPlantilla?.id) {
        const { error } = await supabase
          .from('plantillas_rutinas')
          .update({ nombre: newPlantilla.name, descripcion: newPlantilla.description, icon: newPlantilla.icon })
          .eq('id', editingPlantilla.id)
          .eq('sucursal_id', sucursalId);
        if (error) throw error;
        toast.success('Plantilla actualizada');
      } else {
        const { error } = await supabase
          .from('plantillas_rutinas')
          .insert({ nombre: newPlantilla.name, descripcion: newPlantilla.description, icon: newPlantilla.icon, sucursal_id: sucursalId });
        if (error) throw error;
        toast.success('Plantilla creada');
      }
      setIsPlantillaModalOpen(false);
      setEditingPlantilla(null);
      setNewPlantilla({ name: '', description: '', icon: 'Dumbbell', dias: [{ nombre: 'Día 1', ejercicios: [] }] });
    } catch (error) {
      handleSupabaseError(error, editingPlantilla?.id ? OperationType.UPDATE : OperationType.CREATE, 'plantillas_rutinas');
      toast.error('Error al guardar plantilla');
    }
  };

  const handleDeletePlantilla = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return;
    try {
      const { error } = await supabase.from('plantillas_rutinas').delete().eq('id', id).eq('sucursal_id', sucursalId);
      if (error) throw error;
      toast.success('Plantilla eliminada');
    } catch (error) {
      handleSupabaseError(error, OperationType.DELETE, `plantillas_rutinas/${id}`);
      toast.error('Error al eliminar plantilla');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-orange-500" />
            Catálogo de Rutinas
          </h2>
          <p className="text-gray-500 mt-1">Explora ejercicios y plantillas disponibles para los socios</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex bg-[#111] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('exercises')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'exercises' ? 'bg-orange-500 text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              Ejercicios
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'templates' ? 'bg-orange-500 text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              Plantillas
            </button>
          </div>

          <button
            onClick={() => {
              if (activeTab === 'exercises') {
                setEditingEjercicio(null);
                setNewEjercicio({ 
                  nombre: '', 
                  musculo: 'Pecho', 
                  descripcion: '', 
                  videoUrl: '',
                  equipamiento: 'Mancuernas',
                  categoria: 'Fuerza'
                });
                setIsEjercicioModalOpen(true);
              } else {
                setEditingPlantilla(null);
                setNewPlantilla({ 
                  name: '', 
                  description: '', 
                  icon: 'Dumbbell', 
                  dias: [{ nombre: 'Día 1', ejercicios: [] }] 
                });
                setIsPlantillaModalOpen(true);
              }
            }}
            className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-black font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'exercises' ? 'Nuevo Ejercicio' : 'Nueva Plantilla'}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'exercises' ? (
          <motion.div
            key="exercises"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar ejercicios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-orange-500 transition-all text-white"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                <button
                  onClick={() => setSelectedMuscle(null)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                    !selectedMuscle ? 'bg-orange-500 border-orange-500 text-black' : 'bg-[#111] border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                >
                  Todos
                </button>
                {muscles.map(muscle => (
                  <button
                    key={muscle}
                    onClick={() => setSelectedMuscle(muscle)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                      selectedMuscle === muscle ? 'bg-orange-500 border-orange-500 text-black' : 'bg-[#111] border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    {muscle}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExercises.map((exercise, index) => (
                <motion.div
                  key={exercise.id || exercise.nombre}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-[#111] border border-white/10 rounded-2xl p-6 hover:border-orange-500/30 transition-all group relative"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Dumbbell className="w-6 h-6 text-orange-500" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingEjercicio(exercise);
                          setNewEjercicio(exercise);
                          setIsEjercicioModalOpen(true);
                        }}
                        className="p-2 bg-white/5 text-gray-400 rounded-lg hover:bg-orange-500 hover:text-black transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => exercise.id && handleDeleteEjercicio(exercise.id)}
                        className="p-2 bg-white/5 text-gray-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {exercise.videoUrl && (
                        <a 
                          href={exercise.videoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 bg-lime-500/10 text-lime-500 rounded-lg hover:bg-lime-500 hover:text-black transition-all"
                          title="Ver video"
                        >
                          <Play className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1">{exercise.nombre}</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest px-2 py-1 bg-orange-500/10 rounded-md">
                      {exercise.musculo}
                    </span>
                    {exercise.equipamiento && (
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 py-1 bg-white/5 rounded-md">
                        {exercise.equipamiento}
                      </span>
                    )}
                    {exercise.categoria && (
                      <span className="text-[10px] font-bold text-lime-500 uppercase tracking-widest px-2 py-1 bg-lime-500/10 rounded-md">
                        {exercise.categoria}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed">{exercise.descripcion}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="templates"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {plantillas.map((template, index) => {
              const Icon = getTemplateIcon(template.icon);
              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-[#111] border border-white/10 rounded-3xl p-8 hover:border-orange-500/30 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-4 right-4 flex gap-2 z-10">
                    <button
                      onClick={() => {
                        setEditingPlantilla(template);
                        setNewPlantilla(template);
                        setIsPlantillaModalOpen(true);
                      }}
                      className="p-2 bg-white/5 text-gray-400 rounded-lg hover:bg-orange-500 hover:text-black transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => template.id && handleDeletePlantilla(template.id)}
                      className="p-2 bg-white/5 text-gray-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-orange-500/10 transition-all" />
                  
                  <div className="flex items-start gap-6 relative">
                    <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="w-8 h-8 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-white mb-2">{template.name}</h4>
                      <p className="text-gray-500 leading-relaxed mb-6">{template.description}</p>
                      
                      <div 
                        onClick={() => setViewingTemplate(template)}
                        className="flex items-center gap-2 text-orange-500 text-sm font-bold group-hover:gap-3 transition-all cursor-pointer"
                      >
                        Ver ejercicios incluidos
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {/* Ejercicio Modal */}
        {isEjercicioModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEjercicioModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">{editingEjercicio ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}</h3>
                <button onClick={() => setIsEjercicioModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Nombre</label>
                  <input
                    type="text"
                    value={newEjercicio.nombre}
                    onChange={(e) => setNewEjercicio({...newEjercicio, nombre: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-all"
                    placeholder="Ej: Press de Banca"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Músculo</label>
                  <select
                    value={newEjercicio.musculo}
                    onChange={(e) => setNewEjercicio({...newEjercicio, musculo: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-all appearance-none"
                  >
                    <option value="Pecho">Pecho</option>
                    <option value="Espalda">Espalda</option>
                    <option value="Piernas">Piernas</option>
                    <option value="Hombros">Hombros</option>
                    <option value="Bíceps">Bíceps</option>
                    <option value="Tríceps">Tríceps</option>
                    <option value="Core">Core</option>
                    <option value="Cardio">Cardio</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Equipamiento</label>
                    <select
                      value={newEjercicio.equipamiento}
                      onChange={(e) => setNewEjercicio({...newEjercicio, equipamiento: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-all appearance-none"
                    >
                      <option value="Mancuernas">Mancuernas</option>
                      <option value="Barra">Barra</option>
                      <option value="Máquina">Máquina</option>
                      <option value="Polea">Polea</option>
                      <option value="Peso Corporal">Peso Corporal</option>
                      <option value="Bandas">Bandas</option>
                      <option value="Kettlebell">Kettlebell</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Categoría</label>
                    <select
                      value={newEjercicio.categoria}
                      onChange={(e) => setNewEjercicio({...newEjercicio, categoria: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-all appearance-none"
                    >
                      <option value="Fuerza">Fuerza</option>
                      <option value="Hipertrofia">Hipertrofia</option>
                      <option value="Cardio">Cardio</option>
                      <option value="Flexibilidad">Flexibilidad</option>
                      <option value="Potencia">Potencia</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Descripción</label>
                  <textarea
                    value={newEjercicio.descripcion}
                    onChange={(e) => setNewEjercicio({...newEjercicio, descripcion: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-all h-24 resize-none"
                    placeholder="Descripción del ejercicio..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">URL Video (YouTube/Vimeo)</label>
                  <input
                    type="text"
                    value={newEjercicio.videoUrl}
                    onChange={(e) => setNewEjercicio({...newEjercicio, videoUrl: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-all"
                    placeholder="https://..."
                  />
                </div>

                <button
                  onClick={handleSaveEjercicio}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all mt-4"
                >
                  <Save className="w-5 h-5" />
                  Guardar Ejercicio
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Plantilla Modal */}
        {isPlantillaModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPlantillaModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-4xl bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">{editingPlantilla ? 'Editar Plantilla' : 'Nueva Plantilla'}</h3>
                <button onClick={() => setIsPlantillaModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Info */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Nombre de Plantilla</label>
                    <input
                      type="text"
                      value={newPlantilla.name}
                      onChange={(e) => setNewPlantilla({...newPlantilla, name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-all"
                      placeholder="Ej: Definición Extrema"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Descripción</label>
                    <textarea
                      value={newPlantilla.description}
                      onChange={(e) => setNewPlantilla({...newPlantilla, description: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-all h-20 resize-none"
                      placeholder="Descripción de la rutina..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Icono</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['Dumbbell', 'Zap', 'Trophy', 'Target'].map(iconName => {
                        const Icon = getTemplateIcon(iconName);
                        return (
                          <button
                            key={iconName}
                            onClick={() => setNewPlantilla({...newPlantilla, icon: iconName})}
                            className={`p-4 rounded-xl border transition-all flex items-center justify-center ${
                              newPlantilla.icon === iconName ? 'bg-orange-500 border-orange-500 text-black' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                            }`}
                          >
                            <Icon className="w-6 h-6" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={handleSavePlantilla}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all mt-4"
                  >
                    <Save className="w-5 h-5" />
                    Guardar Plantilla
                  </button>
                </div>

                {/* Right Column: Days and Exercises */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Estructura por Días</label>
                    <button
                      onClick={() => setNewPlantilla({
                        ...newPlantilla,
                        dias: [...(newPlantilla.dias || []), { nombre: `Día ${(newPlantilla.dias || []).length + 1}`, ejercicios: [] }]
                      })}
                      className="text-orange-500 text-xs font-bold flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      Añadir Día
                    </button>
                  </div>

                  <div className="space-y-4">
                    {(newPlantilla.dias || []).map((dia, diaIndex) => (
                      <div key={diaIndex} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <input
                            type="text"
                            value={dia.nombre || ''}
                            onChange={(e) => {
                              const updatedDias = [...(newPlantilla.dias || [])];
                              if (updatedDias[diaIndex]) {
                                updatedDias[diaIndex].nombre = e.target.value;
                                setNewPlantilla({...newPlantilla, dias: updatedDias});
                              }
                            }}
                            className="bg-transparent border-b border-white/10 text-white font-bold focus:outline-none focus:border-orange-500 px-1 py-0.5 flex-1"
                            placeholder="Nombre del día..."
                          />
                          <button
                            onClick={() => {
                              const updatedDias = (newPlantilla.dias || []).filter((_, i) => i !== diaIndex);
                              setNewPlantilla({...newPlantilla, dias: updatedDias});
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          {(dia.ejercicios || []).map((ex, exIndex) => (
                            <div key={exIndex} className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-white">{ex.nombre}</span>
                                <button
                                  onClick={() => {
                                    const updatedDias = [...(newPlantilla.dias || [])];
                                    updatedDias[diaIndex].ejercicios = (updatedDias[diaIndex].ejercicios || []).filter((_, i) => i !== exIndex);
                                    setNewPlantilla({...newPlantilla, dias: updatedDias});
                                  }}
                                  className="text-gray-500 hover:text-red-500"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[9px] text-gray-500 uppercase mb-1">Series</label>
                                  <input
                                    type="text"
                                    value={ex.series || ''}
                                    onChange={(e) => {
                                      const updatedDias = [...(newPlantilla.dias || [])];
                                      if (updatedDias[diaIndex]?.ejercicios?.[exIndex]) {
                                        updatedDias[diaIndex].ejercicios[exIndex].series = e.target.value;
                                        setNewPlantilla({...newPlantilla, dias: updatedDias});
                                      }
                                    }}
                                    placeholder="4"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-2 text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] text-gray-500 uppercase mb-1">Reps</label>
                                  <input
                                    type="text"
                                    value={ex.repeticiones || ''}
                                    onChange={(e) => {
                                      const updatedDias = [...(newPlantilla.dias || [])];
                                      if (updatedDias[diaIndex]?.ejercicios?.[exIndex]) {
                                        updatedDias[diaIndex].ejercicios[exIndex].repeticiones = e.target.value;
                                        setNewPlantilla({...newPlantilla, dias: updatedDias});
                                      }
                                    }}
                                    placeholder="12"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-2 text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] text-gray-500 uppercase mb-1">Descanso</label>
                                  <input
                                    type="text"
                                    value={ex.descanso || ''}
                                    onChange={(e) => {
                                      const updatedDias = [...(newPlantilla.dias || [])];
                                      if (updatedDias[diaIndex]?.ejercicios?.[exIndex]) {
                                        updatedDias[diaIndex].ejercicios[exIndex].descanso = e.target.value;
                                        setNewPlantilla({...newPlantilla, dias: updatedDias});
                                      }
                                    }}
                                    placeholder="60s"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-2 text-xs text-white"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[9px] text-gray-500 uppercase mb-1">Notas</label>
                                <input
                                  type="text"
                                  value={ex.observaciones || ''}
                                  onChange={(e) => {
                                    const updatedDias = [...(newPlantilla.dias || [])];
                                    updatedDias[diaIndex].ejercicios[exIndex].observaciones = e.target.value;
                                    setNewPlantilla({...newPlantilla, dias: updatedDias});
                                  }}
                                  placeholder="Ej: Controlar el descenso"
                                  className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-2 text-xs text-white"
                                />
                              </div>
                            </div>
                          ))}

                          <div className="relative">
                            <select
                              onChange={(e) => {
                                const exercise = (ejercicios || []).find(ex => ex.id === e.target.value);
                                if (exercise) {
                                  const updatedDias = [...(newPlantilla.dias || [])];
                                  if (!updatedDias[diaIndex].ejercicios) updatedDias[diaIndex].ejercicios = [];
                                  updatedDias[diaIndex].ejercicios.push({
                                    ejercicioId: exercise.id!,
                                    nombre: exercise.nombre || '',
                                    series: '4',
                                    repeticiones: '12',
                                    descanso: '60s',
                                    observaciones: ''
                                  });
                                  setNewPlantilla({...newPlantilla, dias: updatedDias});
                                }
                                e.target.value = "";
                              }}
                              className="w-full bg-orange-500/10 border border-orange-500/20 rounded-xl py-2 px-4 text-orange-500 text-xs font-bold focus:outline-none appearance-none cursor-pointer hover:bg-orange-500/20 transition-all"
                            >
                              <option value="">+ Añadir Ejercicio</option>
                              {(ejercicios || []).map(ex => (
                                <option key={ex.id} value={ex.id}>{ex.nombre} ({ex.musculo})</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* View Template Modal */}
        {viewingTemplate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingTemplate(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-[#111] border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                      {React.createElement(getTemplateIcon(viewingTemplate.icon), { className: "w-6 h-6 text-orange-500" })}
                    </div>
                    <h3 className="text-xl font-bold text-white">{viewingTemplate.name}</h3>
                  </div>
                  <button onClick={() => setViewingTemplate(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-8">
                  <p className="text-gray-400 text-sm">{viewingTemplate.description}</p>
                  
                  <div className="space-y-6">
                    {(viewingTemplate.dias || []).map((dia, idx) => (
                      <div key={idx} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-orange-500" />
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider">{dia.nombre}</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {(dia.ejercicios || []).map((ex, exIdx) => (
                            <div key={exIdx} className="p-4 bg-white/5 rounded-2xl border border-white/10">
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-bold text-white">{ex.nombre}</span>
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <Zap className="w-3 h-3 text-orange-500" />
                                    {ex.series} series
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <Target className="w-3 h-3 text-orange-500" />
                                    {ex.repeticiones} reps
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <Clock className="w-3 h-3 text-orange-500" />
                                    {ex.descanso}
                                  </div>
                                </div>
                              </div>
                              {ex.observaciones && (
                                <div className="flex items-start gap-2 mt-2 p-2 bg-black/20 rounded-lg">
                                  <FileText className="w-3 h-3 text-gray-500 mt-0.5" />
                                  <p className="text-[11px] text-gray-500 italic">{ex.observaciones}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setViewingTemplate(null)}
                  className="w-full mt-8 bg-orange-500 hover:bg-orange-600 text-black font-bold py-3 rounded-2xl transition-all"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
