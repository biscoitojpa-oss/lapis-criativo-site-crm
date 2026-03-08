import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import CRMLayout from "./pages/CRMLayout";
import CRMDashboard from "./pages/crm/CRMDashboard";
import CRMLeads from "./pages/crm/CRMLeads";
import CRMTools from "./pages/crm/CRMTools";
import CRMToolPage from "./pages/crm/CRMToolPage";
import DiagnosticoPage from "./pages/DiagnosticoPage";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/crm" element={<ProtectedRoute><CRMLayout /></ProtectedRoute>}>
              <Route index element={<CRMDashboard />} />
              <Route path="leads" element={<CRMLeads />} />
              <Route path="ferramentas" element={<CRMTools />} />
              <Route path="ferramentas/:toolId" element={<CRMToolPage />} />
              <Route path="diagnostico" element={<DiagnosticoPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
