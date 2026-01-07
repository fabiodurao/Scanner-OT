import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import Sites from "./pages/Sites";
import SiteDetail from "./pages/SiteDetail";
import EquipmentDetail from "./pages/EquipmentDetail";
import Variables from "./pages/Variables";
import Upload from "./pages/Upload";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import PendingApproval from "./pages/PendingApproval";
import UserManagement from "./pages/UserManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, profile, loading } = useAuth();

  // Only show loading on protected routes, not on login
  return (
    <Routes>
      {/* Login - always accessible, redirect if already logged in */}
      <Route 
        path="/login" 
        element={<LoginRoute />} 
      />
      
      {/* Pending approval route */}
      <Route 
        path="/pending-approval" 
        element={<PendingApprovalRoute />} 
      />
      
      {/* Protected routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sites" 
        element={
          <ProtectedRoute>
            <Sites />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sites/:siteId" 
        element={
          <ProtectedRoute>
            <SiteDetail />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sites/:siteId/equipment/:equipmentId" 
        element={
          <ProtectedRoute>
            <EquipmentDetail />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/variables" 
        element={
          <ProtectedRoute>
            <Variables />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/upload" 
        element={
          <ProtectedRoute>
            <Upload />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/users" 
        element={
          <ProtectedRoute requireAdmin>
            <UserManagement />
          </ProtectedRoute>
        } 
      />
      
      {/* Catch all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Separate component for login route logic
const LoginRoute = () => {
  const { user, profile, loading } = useAuth();

  // If still loading, show login page (not loading screen)
  // This prevents infinite loading on login page
  if (loading) {
    return <Login />;
  }

  // If logged in and approved, redirect to home
  if (user && profile?.is_approved) {
    return <Navigate to="/" replace />;
  }

  // If logged in but not approved, redirect to pending
  if (user && profile && !profile.is_approved) {
    return <Navigate to="/pending-approval" replace />;
  }

  return <Login />;
};

// Separate component for pending approval route logic
const PendingApprovalRoute = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.is_approved) {
    return <Navigate to="/" replace />;
  }

  return <PendingApproval />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;