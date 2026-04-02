import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { UserProfile } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * When provided, only users whose role is in this list will see the
   * children. Users with a valid session but the wrong role will see the
   * access-denied fallback instead.
   *
   * @example
   * <ProtectedRoute allowedRoles={['owner', 'receptionist']}>
   *   <ReportsModule />
   * </ProtectedRoute>
   */
  allowedRoles?: Array<UserProfile['role']>;
  /**
   * Custom node rendered when the user is not authenticated.
   * Defaults to a "session required" message.
   */
  unauthenticatedFallback?: React.ReactNode;
}

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-gray-500">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      >
        <Loader2 className="w-8 h-8 text-orange-500" />
      </motion.div>
      <span className="text-sm font-medium">Verificando sesión...</span>
    </div>
  );
}

function UnauthenticatedScreen({ fallback }: { fallback?: React.ReactNode }) {
  if (fallback) return <>{fallback}</>;
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-gray-500">
      <ShieldAlert className="w-10 h-10 text-orange-500" />
      <p className="text-sm font-medium">Se requiere iniciar sesión para acceder a esta sección.</p>
    </div>
  );
}

function AccessDeniedScreen({ role }: { role: string | undefined }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[40vh] gap-4"
    >
      <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center border border-red-500/20">
        <ShieldAlert className="w-8 h-8 text-red-500" />
      </div>
      <div className="text-center">
        <p className="text-white font-bold text-lg">Acceso denegado</p>
        <p className="text-gray-500 text-sm mt-1">
          Tu rol{role ? ` (${role})` : ''} no tiene permisos para ver esta sección.
        </p>
      </div>
    </motion.div>
  );
}

/**
 * ProtectedRoute — guard wrapper for authenticated and role-restricted content.
 *
 * This project does not use react-router-dom, so protection is enforced at
 * render time: unauthorized states render a fallback UI instead of the
 * children, without performing a URL redirect.
 *
 * Checks (in order):
 *   1. Auth loading  → spinner
 *   2. No active session  → unauthenticatedFallback (or default message)
 *   3. Role not in allowedRoles  → access denied screen
 *   4. All clear  → children
 */
export default function ProtectedRoute({
  children,
  allowedRoles,
  unauthenticatedFallback,
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <UnauthenticatedScreen fallback={unauthenticatedFallback} />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = profile?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return <AccessDeniedScreen role={userRole} />;
    }
  }

  return <>{children}</>;
}
