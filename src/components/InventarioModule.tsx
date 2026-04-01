import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  X, 
  CheckCircle2,
  Tag,
  DollarSign,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface InventarioItem {
  id: string;
  nombre: string;
  precio: number;
  tipo: 'producto' | 'servicio';
  categoria?: string;
  duracion_dias?: number;
  created_at: string;
}

export default function InventarioModule({ canManage = true }: { canManage?: boolean }) {
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'producto' | 'servicio'>('producto');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventarioItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    tipo: 'producto' as 'producto' | 'servicio',
    categoria: '',
    duracion_dias: '30'
  });

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('inventario')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching inventory:", error);
        toast.error("Error al cargar el inventario");
      } else {
        setItems(data as InventarioItem[]);
      }
      setLoading(false);
    };

    fetchItems();

    const channel = supabase
      .channel('inventario-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario' }, fetchItems)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.precio) {
      toast.error("Por favor completa los campos obligatorios");
      return;
    }

    try {
      const itemData: any = {
        nombre: formData.nombre,
        precio: Number(formData.precio),
        tipo: formData.tipo,
        categoria: formData.categoria || (formData.tipo === 'servicio' ? 'Membresía' : 'General')
      };

      if (formData.tipo === 'servicio') {
        itemData.duracion_dias = Number(formData.duracion_dias);
      }

      if (editingItem) {
        const { error } = await supabase
          .from('inventario')
          .update(itemData)
          .eq('id', editingItem.id);
        if (error) throw error;
        toast.success("Ítem actualizado correctamente");
      } else {
        const { error } = await supabase
          .from('inventario')
          .insert(itemData);
        if (error) throw error;
        toast.success("Ítem agregado al inventario");
      }

      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ nombre: '', precio: '', tipo: activeTab, categoria: '', duracion_dias: '30' });
    } catch (error: any) {
      console.error("Error saving inventory item:", error);
      toast.error("Error al guardar el ítem: " + (error.message || "Error desconocido"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este ítem?")) return;
    try {
      const { error } = await supabase.from('inventario').delete().eq('id', id);
      if (error) throw error;
      toast.success("Ítem eliminado");
    } catch (error: any) {
      console.error("Error deleting item:", error);
      toast.error("Error al eliminar: " + (error.message || "Error desconocido"));
    }
  };

  const filteredItems = items.filter(item => 
    item.tipo === activeTab && 
    item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Package className="w-8 h-8 text-orange-500" />
            Gestión de Inventario
          </h2>
          <p className="text-gray-500 mt-1">Administra productos físicos y servicios de membresía</p>
        </div>
        
        {canManage && (
          <button
            onClick={() => {
              setFormData({ ...formData, tipo: activeTab });
              setIsModalOpen(true);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-black font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-5 h-5" />
            Nuevo {activeTab === 'producto' ? 'Producto' : 'Servicio'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-[#111] border border-white/10 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('producto')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'producto' ? "bg-orange-500 text-black" : "text-gray-500 hover:text-white"
          )}
        >
          <Package className="w-4 h-4" />
          Productos
        </button>
        <button
          onClick={() => setActiveTab('servicio')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'servicio' ? "bg-orange-500 text-black" : "text-gray-500 hover:text-white"
          )}
        >
          <Tag className="w-4 h-4" />
          Servicios
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder={`Buscar ${activeTab === 'producto' ? 'productos' : 'servicios'}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-orange-500 transition-all text-white"
        />
      </div>

      {/* Table */}
      <div className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-bottom border-white/5 bg-white/5">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Nombre</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Categoría</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Precio</th>
                {canManage && <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-500 text-sm">Cargando inventario...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 text-sm italic">
                    No hay {activeTab === 'producto' ? 'productos' : 'servicios'} registrados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={item.id} 
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-200">{item.nombre}</span>
                      {item.tipo === 'servicio' && (
                        <span className="text-[10px] text-gray-500 block">Duración: {item.duracion_dias} días</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-1 bg-white/5 rounded-lg text-gray-400 border border-white/5">
                        {item.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-orange-500">${item.precio}</span>
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingItem(item);
                              setFormData({
                                nombre: item.nombre,
                                precio: item.precio.toString(),
                                tipo: item.tipo,
                                categoria: item.categoria || '',
                                duracion_dias: (item.duracion_dias || 30).toString()
                              });
                              setIsModalOpen(true);
                            }}
                            className="p-2 hover:bg-white/5 text-gray-500 hover:text-blue-400 transition-colors rounded-lg"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-2 hover:bg-white/5 text-gray-500 hover:text-red-400 transition-colors rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setEditingItem(null);
              }}
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
                  <h3 className="text-xl font-bold text-white">
                    {editingItem ? 'Editar' : 'Nuevo'} {formData.tipo === 'producto' ? 'Producto' : 'Servicio'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nombre</label>
                    <input
                      required
                      type="text"
                      placeholder="Ej. Agua 600ml o Mensualidad"
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                      className="w-full bg-black border border-white/10 rounded-2xl py-4 px-5 focus:outline-none focus:border-orange-500 transition-all text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Precio ($)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          required
                          type="number"
                          placeholder="0.00"
                          value={formData.precio}
                          onChange={e => setFormData({...formData, precio: e.target.value})}
                          className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-10 pr-5 focus:outline-none focus:border-orange-500 transition-all text-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Categoría</label>
                      <div className="relative">
                        <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Ej. Bebidas"
                          value={formData.categoria}
                          onChange={e => setFormData({...formData, categoria: e.target.value})}
                          className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-10 pr-5 focus:outline-none focus:border-orange-500 transition-all text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tipo</label>
                    <div className="flex p-1 bg-black border border-white/10 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, tipo: 'producto'})}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-xs font-bold transition-all",
                          formData.tipo === 'producto' ? "bg-white/10 text-white" : "text-gray-500"
                        )}
                      >
                        Producto
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, tipo: 'servicio'})}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-xs font-bold transition-all",
                          formData.tipo === 'servicio' ? "bg-white/10 text-white" : "text-gray-500"
                        )}
                      >
                        Servicio
                      </button>
                    </div>
                  </div>

                  {formData.tipo === 'servicio' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Duración de la Membresía (Días)</label>
                      <input
                        required
                        type="number"
                        placeholder="Ej. 30"
                        value={formData.duracion_dias}
                        onChange={e => setFormData({...formData, duracion_dias: e.target.value})}
                        className="w-full bg-black border border-white/10 rounded-2xl py-4 px-5 focus:outline-none focus:border-orange-500 transition-all text-white font-mono"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {editingItem ? 'Actualizar' : 'Guardar'} Ítem
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
