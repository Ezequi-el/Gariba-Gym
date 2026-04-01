import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  ShoppingBag, 
  BarChart3,
  PieChart as PieChartIcon,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { startOfMonth, endOfMonth, subMonths, format, differenceInDays, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface ReportsModuleProps {
  sucursalId: string;
}

export default function ReportsModule({ sucursalId }: ReportsModuleProps) {
  const [loading, setLoading] = useState(true);
  const [mrr, setMrr] = useState(0);
  const [churnRate, setChurnRate] = useState(0);
  const [bestSellers, setBestSellers] = useState<{name: string, value: number}[]>([]);
  const [topCustomers, setTopCustomers] = useState<{name: string, value: number}[]>([]);
  const [salesHistory, setSalesHistory] = useState<{date: string, total: number}[]>([]);
  const [activeSociosCount, setActiveSociosCount] = useState(0);

  useEffect(() => {
    if (!sucursalId) return;
    fetchData();
  }, [sucursalId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const lastMonth = subMonths(now, 1);

      // Fetch Socios for MRR and Churn
      const { data: sociosData, error: sociosError } = await supabase
        .from('socios')
        .select('*')
        .eq('sucursal_id', sucursalId);

      if (sociosError) throw sociosError;

      let totalMrr = 0;
      let activeCount = 0;
      let expiredLastMonth = 0;

      sociosData.forEach((socio: any) => {
        const vencimiento = socio.fecha_vencimiento ? parseISO(socio.fecha_vencimiento) : null;
        if (socio.estado === 'Activa') {
          activeCount++;
          totalMrr += 500; // Default fallback price
        }
        
        if (vencimiento && vencimiento >= lastMonth && vencimiento <= now && socio.estado === 'Vencida') {
          expiredLastMonth++;
        }
      });

      setMrr(totalMrr);
      setActiveSociosCount(activeCount);
      
      const churn = activeCount + expiredLastMonth > 0 
        ? (expiredLastMonth / (activeCount + expiredLastMonth)) * 100 
        : 0;
      setChurnRate(churn);

      // Fetch Sales for Best Sellers and History
      const { data: ventasData, error: ventasError } = await supabase
        .from('ventas')
        .select(`
          id,
          total,
          fecha,
          socios (nombre),
          venta_items (
            cantidad,
            inventario (nombre)
          )
        `)
        .eq('sucursal_id', sucursalId)
        .order('fecha', { ascending: false })
        .limit(500);

      if (ventasError) throw ventasError;

      const productSales: {[key: string]: number} = {};
      const customerSales: {[key: string]: {name: string, total: number}} = {};
      const history: {[key: string]: number} = {};

      ventasData.forEach((venta: any) => {
        const date = format(parseISO(venta.fecha), 'dd/MM');
        history[date] = (history[date] || 0) + (venta.total || 0);

        // Track customer sales
        if (venta.socios?.nombre) {
          const socioName = venta.socios.nombre;
          if (!customerSales[socioName]) {
            customerSales[socioName] = { name: socioName, total: 0 };
          }
          customerSales[socioName].total += (venta.total || 0);
        }

        if (venta.venta_items) {
          venta.venta_items.forEach((item: any) => {
            const productName = item.inventario?.nombre || 'Desconocido';
            productSales[productName] = (productSales[productName] || 0) + (item.cantidad || 1);
          });
        }
      });

      const bestSellersData = Object.entries(productSales)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
      
      setBestSellers(bestSellersData);

      const topCustomersData = Object.values(customerSales)
        .map(c => ({ name: c.name, value: c.total }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
      
      setTopCustomers(topCustomersData);

      const historyData = Object.entries(history)
        .map(([date, total]) => ({ date, total }))
        .reverse();
      setSalesHistory(historyData);

    } catch (error: any) {
      console.error("Error fetching report data:", error);
      toast.error("Error al generar reportes: " + (error.message || "Error desconocido"));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 animate-pulse">Generando reportes avanzados...</p>
      </div>
    );
  }

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#ec4899'];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">
            Analítica <span className="text-orange-500">Avanzada</span>
          </h2>
          <p className="text-gray-500 text-sm">Métricas clave para el crecimiento de tu gimnasio</p>
        </div>
        <button 
          onClick={fetchData}
          className="p-2 hover:bg-white/5 rounded-full transition-colors"
        >
          <Calendar className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          title="MRR (Ingresos Recurrentes)" 
          value={`$${mrr.toLocaleString()}`} 
          subValue="Estimado mensual"
          icon={<DollarSign className="w-6 h-6 text-green-500" />}
          trend={+12.5}
        />
        <MetricCard 
          title="Tasa de Deserción (Churn)" 
          value={`${churnRate.toFixed(1)}%`} 
          subValue="Últimos 30 días"
          icon={<TrendingDown className="w-6 h-6 text-red-500" />}
          trend={-2.1}
          inverseTrend
        />
        <MetricCard 
          title="Socios Activos" 
          value={activeSociosCount.toString()} 
          subValue="En esta sucursal"
          icon={<Users className="w-6 h-6 text-blue-500" />}
          trend={+5.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales History Chart */}
        <div className="bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Historial de Ventas
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesHistory}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#f97316' }}
                />
                <Area type="monotone" dataKey="total" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Best Sellers Chart */}
        <div className="bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-500" />
              Productos Más Vendidos
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bestSellers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#fff" fontSize={12} width={100} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {bestSellers.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Customers Chart */}
        <div className="bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Clientes que Más Compran ($)
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCustomers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#fff" fontSize={12} width={100} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  formatter={(value) => [`$${value}`, 'Total Comprado']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {topCustomers.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subValue, icon, trend, inverseTrend = false }: any) {
  const isPositive = trend > 0;
  const isGood = inverseTrend ? !isPositive : isPositive;

  return (
    <div className="bg-[#111] border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</span>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-black text-white">{value}</span>
          <span className={cn(
            "text-xs font-bold flex items-center gap-0.5",
            isGood ? "text-green-500" : "text-red-500"
          )}>
            {isPositive ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        </div>
        <span className="text-xs text-gray-500">{subValue}</span>
      </div>
    </div>
  );
}
