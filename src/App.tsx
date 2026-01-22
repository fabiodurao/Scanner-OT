import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProcessingJobsProvider } from "@/contexts/ProcessingJobsContext";
import { AnalysisJobsProvider } from "@/contexts/AnalysisJobsContext";
import { UploadProvider } from "@/contexts/UploadContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import Index from "./pages/Index";
import Sites from "./pages/Sites";
import SiteDetail from "./pages/SiteDetail";
import EquipmentDetail from "./pages/EquipmentDetail";
import Variables from "./pages/Variables";
import Upload from "./pages/Upload";
import PcapProcessing from "./pages/PcapProcessing";
import SitesManagement from "./pages/SitesManagement";
import Discovery from "./pages/Discovery";
import UnknownSites from "./pages/UnknownSites";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import PendingApproval from "./pages/PendingApproval";
import UserManagement from "./pages/UserManagement";
import NotFound from "./pages/NotFound";
import VariablesReview from "./pages/VariablesReview";

const queryClient = new QueryClient();

// Component to handle navigation events
const NavigationListener = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleNavigateToAnalysis = (event: Event) => {
      const customEvent = event as CustomEvent<{ siteIdentifier: string }>;
      const { siteIdentifier } = customEvent.detail;
      
      console.log('[NavigationListener] Navigating to analysis for site:', siteIdentifier);
      
      // Navigate to historical analysis tab
      navigate(`/discovery/${siteIdentifier}?tab=historical`);
      
      // Reload after a short delay to ensure fresh data
      setTimeout(() => {
        window.location.reload();
      }, 100);
    };
    
    window.addEventListener('navigate-to-analysis', handleNavigateToAnalysis);
    
    return () => {
      window.removeEventListener('navigate-to-analysis', handleNavigateToAnalysis);
    };
  }, [navigate]);
  
  return null;
};

const AppRoutes = () => {
  return (
    <>
      <NavigationListener />
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/pending-approval" element={<PendingApprovalRoute />} />
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/sites" element={<ProtectedRoute><Sites /></ProtectedRoute>} />
        <Route path="/sites/:siteId" element={<ProtectedRoute><SiteDetail /></ProtectedRoute>} />
        <Route path="/sites/:siteId/equipment/:equipmentId" element={<ProtectedRoute><EquipmentDetail /></ProtectedRoute>} />
        <Route path="/variables" element={<ProtectedRoute><Variables /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="/processing" element={<ProtectedRoute><PcapProcessing /></ProtectedRoute>} />
        <Route path="/sites-management" element={<ProtectedRoute><SitesManagement /></ProtectedRoute>} />
        <Route path="/discovery" element={<ProtectedRoute><UnknownSites /></ProtectedRoute>} />
        <Route path="/discovery/:siteId" element={<ProtectedRoute><Discovery /></ProtectedRoute>} />
        <Route path="/discovery/:siteId/variables" element={<ProtectedRoute><VariablesReview /></ProtectedRoute>} />
        <Route path="/customers" element={<Navigate to="/sites-management" replace />} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute requireAdmin><UserManagement /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const LoginRoute = () => {
  const { user, profile, loading } = useAuth();
  if (loading) return <Login />;
  if (user && profile?.is_approved) return <Navigate to="/" replace />;
  if (user && profile && !profile.is_approved) return <Navigate to="/pending-approval" replace />;
  return <Login />;
};

const PendingApprovalRoute = () => {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><Loader2 className="h-12 w-12 animate-spin text-emerald-500" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.is_approved) return <Navigate to="/" replace />;
  return <PendingApproval />;
};

const AppWithProviders = () => {
  return (
    <AuthProvider>
      <ProcessingJobsProvider>
        <AnalysisJobsProvider>
          <UploadProvider>
            <AppRoutes />
          </UploadProvider>
        </AnalysisJobsProvider>
      </ProcessingJobsProvider>
    </AuthProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppWithProviders />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;