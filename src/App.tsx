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

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-900">
    <div className="text-center">
      <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
      <p className="text-slate-400">Carregando...</p>
    </div>
  </div>
);

const AppRoutes = () => {
  const { user, profile, loading } = useAuth();

  // Show loading screen while checking auth
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={
          user && profile?.is_approved ? (
            <Navigate to="/" replace />
          ) : (
            <Login />
          )
        } 
      />
      
      {/* Pending approval route */}
      <Route 
        path="/pending-approval" 
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : profile && !profile.is_approved ? (
            <PendingApproval />
          ) : (
            <Navigate to="/" replace />
          )
        } 
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