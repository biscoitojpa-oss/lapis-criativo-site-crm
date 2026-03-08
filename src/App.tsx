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
import CRMClientes from "./pages/crm/CRMClientes";
import ClienteDetalhe from "./pages/crm/ClienteDetalhe";
import CRMPropostas from "./pages/crm/CRMPropostas";
import PropostaForm from "./pages/crm/PropostaForm";
import PropostaDetalhe from "./pages/crm/PropostaDetalhe";
import CRMContratos from "./pages/crm/CRMContratos";
import ContratoForm from "./pages/crm/ContratoForm";
import ContratoDetalhe from "./pages/crm/ContratoDetalhe";
import CRMServicos from "./pages/crm/CRMServicos";
import CRMUsuarios from "./pages/crm/CRMUsuarios";
import DiagnosticoPage from "./pages/DiagnosticoPage";
import CRMBaseConhecimento from "./pages/crm/CRMBaseConhecimento";
import CRMCriativoX from "./pages/crm/CRMCriativoX";
import CRMBuscadorLeads from "./pages/crm/CRMBuscadorLeads";
import ProtectedRoute from "./components/ProtectedRoute";
import AssinarContrato from "./pages/AssinarContrato";
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
            <Route path="/assinar/:token" element={<AssinarContrato />} />
            <Route path="/crm" element={<ProtectedRoute><CRMLayout /></ProtectedRoute>}>
              <Route index element={<CRMDashboard />} />
              <Route path="leads" element={<CRMLeads />} />
              <Route path="clientes" element={<CRMClientes />} />
              <Route path="clientes/:clienteId" element={<ClienteDetalhe />} />
              <Route path="propostas" element={<CRMPropostas />} />
              <Route path="propostas/nova" element={<PropostaForm />} />
              <Route path="propostas/:propostaId" element={<PropostaDetalhe />} />
              <Route path="contratos" element={<CRMContratos />} />
              <Route path="contratos/novo" element={<ContratoForm />} />
              <Route path="contratos/:contratoId" element={<ContratoDetalhe />} />
              <Route path="servicos" element={<CRMServicos />} />
              <Route path="usuarios" element={<CRMUsuarios />} />
              <Route path="base-conhecimento" element={<CRMBaseConhecimento />} />
              <Route path="criativo-x" element={<CRMCriativoX />} />
              <Route path="buscador-leads" element={<CRMBuscadorLeads />} />
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
