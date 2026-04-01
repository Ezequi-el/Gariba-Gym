import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'motion/react';
import { Socio } from '../types';
import { 
  ShoppingCart, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Plus, 
  Minus,
  CheckCircle2,
  ReceiptText,
  User as UserIcon,
  X,
  Package,
  QrCode,
  Scan,
  Lock as LockIcon
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { cn } from '../lib/utils';
import { addDays, isAfter, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface Product {
  id: string;
  nombre: string;
  precio: number;
  tipo: 'producto' | 'servicio';
  categoria?: string;
  duracion_dias?: number;
}

interface CartItem extends Product {
  cantidad: number;
}

export default function POS({ 
  user, 
  sucursalId, 
  selectedSocio, 
  onClearSocio,
  canViewCashCut = true
}: { 
  user: User, 
  sucursalId: string,
  selectedSocio?: Socio | null,
  onClearSocio?: () => void,
  canViewCashCut?: boolean
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [metodoPago, setMetodoPago] = useState<'Efectivo' | 'Tarjeta'>('Efectivo');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [fetchingInventory, setFetchingInventory] = useState(true);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [searchTermSocio, setSearchTermSocio] = useState('');
  const [showSocioSearch, setShowSocioSearch] = useState(false);
  const [localSelectedSocio, setLocalSelectedSocio] = useState<Socio | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render((decodedText) => {
        try {
          const data = JSON.parse(decodedText);
          if (data.type === 'sale') {
            setCart(data.items.map((item: any) => ({
              ...item,
              tipo: item.tipo || 'producto'
            })));
            
            const socio = socios.find(s => s.id === data.socioId);
            if (socio) {
              setLocalSelectedSocio(socio);
            } else {
              setLocalSelectedSocio({
                id: data.socioId,
                nombre: data.socioNombre,
                fecha_vencimiento: new Date().toISOString(),
                estado: 'Activa'
              } as Socio);
            }
            toast.success("Venta cargada desde QR");
          } else if (data.type === 'socio') {
            const socio = socios.find(s => s.id === data.socioId);
            if (socio) {
              setLocalSelectedSocio(socio);
              toast.success(`Cliente ${socio.nombre} asociado`);
            }
          }
          scanner.clear();
          setShowScanner(false);
        } catch (e) {
          const socio = socios.find(s => s.id === decodedText || s.id.slice(-8).toUpperCase() === decodedText.toUpperCase());
          if (socio) {
            setLocalSelectedSocio(socio);
            toast.success(`Cliente ${socio.nombre} asociado`);
            scanner.clear();
            setShowScanner(false);
          }
        }
      }, (error) => {});

      return () => {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      };
    }
  }, [showScanner, socios]);

  useEffect(() => {
    setLocalSelectedSocio(selectedSocio || null);
  }, [selectedSocio]);

  useEffect(() => {
    const fetchInventory = async () => {
      const { data, error } = await supabase
        .from('inventario')
        .select('*')
        .order('nombre', { ascending: true });
      
      if (data) {
        setInventory(data as Product[]);
      }
      setFetchingInventory(false);
    };
    fetchInventory();

    const channel = supabase.channel('inventory-pos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario' }, fetchInventory)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!sucursalId) return;
    const fetchSocios = async () => {
      const { data, error } = await supabase
        .from('socios')
        .select('*')
        .eq('sucursal_id', sucursalId);
      
      if (data) {
        setSocios((data as Socio[]).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      }
    };
    fetchSocios();

    const channel = supabase.channel('socios-pos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'socios', filter: `sucursal_id=eq.${sucursalId}` }, fetchSocios)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sucursalId]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { ...product, cantidad: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.cantidad + delta);
        return { ...item, cantidad: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const socioToUse = localSelectedSocio;
      
      // 1. Registrar la venta
      const { data: ventaData, error: ventaError } = await supabase
        .from('ventas')
        .insert({
          total,
          metodo_pago: metodoPago,
          fecha: new Date().toISOString(),
          sucursal_id: sucursalId,
          socio_id: socioToUse?.id || null
        })
        .select()
        .single();

      if (ventaError) throw ventaError;

      // 2. Registrar items de venta
      const ventaItems = cart.map(item => ({
        venta_id: ventaData.id,
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio
      }));

      const { error: itemsError } = await supabase
        .from('venta_items')
        .insert(ventaItems);

      if (itemsError) throw itemsError;

      // 3. Si hay un socio seleccionado, procesar renovaciones de servicios
      if (socioToUse) {
        const servicios = cart.filter(item => item.tipo === 'servicio');
        if (servicios.length > 0) {
          let totalDiasAAgregar = 0;
          servicios.forEach(s => {
            totalDiasAAgregar += (s.duracion_dias || 30) * s.cantidad;
          });

          const { data: socioData, error: socioFetchError } = await supabase
            .from('socios')
            .select('fecha_vencimiento')
            .eq('id', socioToUse.id)
            .single();
          
          if (socioData) {
            const currentVencimiento = new Date(socioData.fecha_vencimiento);
            const now = new Date();
            
            const baseDate = isAfter(currentVencimiento, now) ? currentVencimiento : now;
            const newVencimiento = addDays(baseDate, totalDiasAAgregar);

            await supabase
              .from('socios')
              .update({
                fecha_vencimiento: newVencimiento.toISOString(),
                estado: 'Activa'
              })
              .eq('id', socioToUse.id);
            
            toast.success(`Membresía de ${socioToUse.nombre} renovada hasta el ${newVencimiento.toLocaleDateString()}`);
          }
        }
      }
      
      setShowSuccess(true);
      setCart([]);
      setLocalSelectedSocio(null);
      if (onClearSocio) onClearSocio();
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error: any) {
      console.error("Error in checkout:", error);
      toast.error("Error al procesar la venta: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-220px)]">
      {/* Catálogo */}
      <div className="flex-1 lg:overflow-y-auto pr-2 custom-scrollbar">
        {fetchingInventory ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p>Cargando inventario...</p>
          </div>
        ) : inventory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-[#111] rounded-3xl border border-white/5">
            <Package className="w-12 h-12 mb-4 opacity-20" />
            <p>No hay ítems en el inventario.</p>
            <p className="text-xs">Ve a la sección de Inventario para agregar productos o servicios.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {inventory.map((product) => (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={product.id}
                onClick={() => addToCart(product)}
                className={cn(
                  "bg-[#111] border p-3 md:p-4 rounded-2xl text-left transition-all group relative overflow-hidden",
                  product.tipo === 'servicio' ? "border-purple-500/20 hover:border-purple-500/50" : "border-white/10 hover:border-orange-500/50"
                )}
              >
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-4 h-4 text-orange-500" />
                </div>
                <span className={cn(
                  "text-[9px] md:text-[10px] uppercase tracking-widest font-bold mb-1 block",
                  product.tipo === 'servicio' ? "text-purple-400" : "text-gray-500"
                )}>
                  {product.categoria || (product.tipo === 'servicio' ? 'Servicio' : 'Producto')}
                </span>
                <h3 className="text-sm md:text-base font-bold text-gray-200 mb-1 md:mb-2 leading-tight">{product.nombre}</h3>
                <div className="flex items-center justify-between">
                  <p className="text-orange-500 font-mono font-bold text-sm md:text-base">${product.precio}</p>
                  {product.duracion_dias && (
                    <span className="text-[10px] text-gray-600 font-mono">{product.duracion_dias}d</span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Ticket / Carrito */}
      <div className="w-full lg:w-[400px] flex flex-col bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
        {localSelectedSocio ? (
          <div className="p-3 bg-orange-500 text-black flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-tight">Cobrando a: {localSelectedSocio.nombre}</span>
            </div>
            <button 
              onClick={() => {
                setLocalSelectedSocio(null);
                if (onClearSocio) onClearSocio();
              }}
              className="p-1 hover:bg-black/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-3 bg-white/5 border-b border-white/10">
            {!showSocioSearch ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowSocioSearch(true)}
                  className="flex items-center justify-center gap-2 py-2 border border-dashed border-white/20 rounded-xl text-[10px] text-gray-500 hover:text-orange-500 hover:border-orange-500/50 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  Asociar Cliente
                </button>
                <button
                  onClick={() => setShowScanner(true)}
                  className="flex items-center justify-center gap-2 py-2 border border-dashed border-white/20 rounded-xl text-[10px] text-gray-500 hover:text-orange-500 hover:border-orange-500/50 transition-all"
                >
                  <Scan className="w-3 h-3" />
                  Escanear Cliente
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Buscar cliente..."
                    value={searchTermSocio}
                    onChange={(e) => setSearchTermSocio(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-8 pr-8 text-xs focus:outline-none focus:border-orange-500/50"
                  />
                  <button 
                    onClick={() => {
                      setShowSocioSearch(false);
                      setSearchTermSocio('');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                
                {searchTermSocio.length > 0 && (
                  <div className="max-h-32 overflow-y-auto bg-black/60 rounded-xl border border-white/5 custom-scrollbar">
                    {socios
                      .filter(s => s.nombre.toLowerCase().includes(searchTermSocio.toLowerCase()))
                      .slice(0, 5)
                      .map(s => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setLocalSelectedSocio(s);
                            setShowSocioSearch(false);
                            setSearchTermSocio('');
                          }}
                          className="w-full px-3 py-2 text-left text-xs hover:bg-orange-500 hover:text-black transition-colors border-b border-white/5 last:border-0"
                        >
                          <p className="font-bold">{s.nombre}</p>
                          <p className="text-[10px] opacity-70">{s.estado}</p>
                        </button>
                      ))}
                    {socios.filter(s => s.nombre.toLowerCase().includes(searchTermSocio.toLowerCase())).length === 0 && (
                      <p className="p-3 text-[10px] text-gray-500 text-center italic">No se encontraron clientes</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold uppercase tracking-wider text-sm">Ticket de Venta</h2>
          </div>
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-[10px] font-bold text-orange-500 hover:bg-orange-500 hover:text-black transition-all"
          >
            <QrCode className="w-3 h-3" />
            ESCANEAR VENTA
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {cart.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2"
              >
                <ShoppingCart className="w-12 h-12 opacity-20" />
                <p className="text-sm">El carrito está vacío</p>
              </motion.div>
            ) : (
              cart.map((item) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  key={item.id}
                  className="flex items-center justify-between group"
                >
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-200">{item.nombre}</h4>
                    <p className="text-xs text-gray-500 font-mono">${item.precio} x {item.cantidad}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-black/40 rounded-lg border border-white/5">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 hover:text-orange-500 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-mono w-6 text-center">{item.cantidad}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 hover:text-orange-500 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 bg-white/5 border-t border-white/5 space-y-4">
          {/* Método de Pago */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMetodoPago('Efectivo')}
              className={cn(
                "flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-bold transition-all",
                metodoPago === 'Efectivo' 
                  ? "bg-orange-500 border-orange-500 text-black" 
                  : "bg-black/40 border-white/10 text-gray-500 hover:border-white/20"
              )}
            >
              <Banknote className="w-4 h-4" />
              Efectivo
            </button>
            <button
              onClick={() => setMetodoPago('Tarjeta')}
              className={cn(
                "flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-bold transition-all",
                metodoPago === 'Tarjeta' 
                  ? "bg-orange-500 border-orange-500 text-black" 
                  : "bg-black/40 border-white/10 text-gray-500 hover:border-white/20"
              )}
            >
              <CreditCard className="w-4 h-4" />
              Tarjeta
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-gray-500 font-bold uppercase tracking-widest text-xs">Total a Pagar</span>
            <span className="text-3xl font-mono font-bold text-white">${total}</span>
          </div>

          <button
            disabled={cart.length === 0 || loading}
            onClick={handleCheckout}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:grayscale text-black font-black py-4 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20 flex items-center justify-center gap-3"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
            ) : showSuccess ? (
              <>
                <CheckCircle2 className="w-6 h-6" />
                ¡COBRADO!
              </>
            ) : (
              <>
                <ShoppingCart className="w-6 h-6" />
                COBRAR AHORA
              </>
            )}
          </button>
        </div>
      </div>
      {/* Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowScanner(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Scan className="w-5 h-5 text-orange-500" />
                  <h3 className="text-lg font-bold">Escanear Código QR</h3>
                </div>
                <button onClick={() => setShowScanner(false)} className="p-2 hover:bg-white/5 rounded-full">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <div id="reader" className="overflow-hidden rounded-2xl border border-white/10 bg-black"></div>
                <p className="text-center text-xs text-gray-500 mt-4">
                  Coloca el código QR del socio frente a la cámara
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
