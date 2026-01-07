import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-slate-400">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but no profile yet (still loading) or not approved
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-slate-400">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  // User not approved - redirect to pending approval
  if (!profile.is_approved) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Requires admin but user is not admin
  if (requireAdmin && !profile.is_admin) {
    return <Navigate to="/" replace />;
  }

  // All checks passed - render children
  return <>{children}</>;
};