/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SocioApp from './components/SocioApp';
import ErrorBoundary from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [appMode, setAppMode] = useState<'admin' | 'socio'>('admin');
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleStartSimulation = async () => {
    setAppMode('socio');
    setIsSimulating(true);
  };

  const handleStopSimulation = () => {
    setAppMode('admin');
    setIsSimulating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30">
        <AnimatePresence mode="wait">
          {appMode === 'socio' ? (
            <motion.div
              key="socio-app"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SocioApp />
              
              {/* Exit Simulation / Back to Admin Button - Highly Visible */}
              <div className="fixed top-4 right-4 z-[9999]">
                <button 
                  onClick={handleStopSimulation}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-tighter shadow-[0_0_20px_rgba(234,88,12,0.3)] transition-all active:scale-95 border border-orange-400/30"
                >
                  <LogOut className="w-4 h-4" />
                  Salir de Simulación
                </button>
              </div>
            </motion.div>
          ) : !user ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Login onSwitchToSocio={handleStartSimulation} />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Dashboard user={user} onSwitchToSocio={handleStartSimulation} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}

