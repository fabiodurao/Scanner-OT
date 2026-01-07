import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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

  if (loading) {
    return null;
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user && profile?.is_approved ? <Navigate to="/" replace /> : <Login />} 
      />
      <Route 
        path="/pending-approval" 
        element={
          user && profile && !profile.is_approved ? (
            <PendingApproval />
          ) : (
            <Navigate to={user ? "/" : "/login"} replace />
          )
        } 
      />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/sites" element={<ProtectedRoute><Sites /></ProtectedRoute>} />
      <Route path="/sites/:siteId" element={<ProtectedRoute><SiteDetail /></ProtectedRoute>} />
      <Route path="/sites/:siteId/equipment/:equipmentId" element={<ProtectedRoute><EquipmentDetail /></ProtectedRoute>} />
      <Route path="/variables" element={<ProtectedRoute><Variables /></ProtectedRoute>} />
      <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route 
        path="/users" 
        element={
          <ProtectedRoute requireAdmin>
            <UserManagement />
          </ProtectedRoute>
        } 
      />
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