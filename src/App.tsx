import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import SelectCompany from "./pages/SelectCompany";
import SemEmpresa from "./pages/SemEmpresa";
import ResetPassword from "./pages/ResetPassword";
import AceitarConvite from "./pages/AceitarConvite";
import Home from "./pages/Home";
import Triagem from "./pages/Triagem";
import BaseConhecimento from "./pages/BaseConhecimento";
import GerenciarFaqs from "./pages/GerenciarFaqs";
import HorarioAtendimento from "./pages/HorarioAtendimento";
import AdminEmpresas from "./pages/AdminEmpresas";
import CrmFunil from "./pages/CrmFunil";
import CrmAtividades from "./pages/CrmAtividades";
import ConfigUsuarios from "./pages/ConfigUsuarios";
import MeuTime from "./pages/MeuTime";
import ConfigPerfil from "./pages/ConfigPerfil";
import Onboarding from "./pages/Onboarding";
import OnboardingInvalid from "./pages/OnboardingInvalid";
import OnboardingExpired from "./pages/OnboardingExpired";
import OnboardingUsed from "./pages/OnboardingUsed";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/sem-empresa" element={<SemEmpresa />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/onboarding/invalid" element={<OnboardingInvalid />} />
            <Route path="/onboarding/expired" element={<OnboardingExpired />} />
            <Route path="/onboarding/used" element={<OnboardingUsed />} />
            <Route path="/aceitar-convite" element={
              <ProtectedRoute><AceitarConvite /></ProtectedRoute>
            } />
            <Route path="/selecionar-empresa" element={
              <ProtectedRoute><SelectCompany /></ProtectedRoute>
            } />
            <Route path="/home" element={
              <ProtectedRoute><Home /></ProtectedRoute>
            } />
            <Route path="/triagem" element={
              <ProtectedRoute><Triagem /></ProtectedRoute>
            } />
            <Route path="/base-conhecimento" element={
              <ProtectedRoute><BaseConhecimento /></ProtectedRoute>
            } />
            <Route path="/base-conhecimento/faqs" element={
              <ProtectedRoute><GerenciarFaqs /></ProtectedRoute>
            } />
            <Route path="/base-conhecimento/horarios" element={
              <ProtectedRoute><HorarioAtendimento /></ProtectedRoute>
            } />
            <Route path="/crm" element={
              <ProtectedRoute><CrmFunil /></ProtectedRoute>
            } />
            <Route path="/crm/atividades" element={
              <ProtectedRoute><CrmAtividades /></ProtectedRoute>
            } />
            <Route path="/admin/empresas" element={
              <ProtectedRoute><AdminEmpresas /></ProtectedRoute>
            } />
            <Route path="/configuracoes/usuarios" element={
              <ProtectedRoute><ConfigUsuarios /></ProtectedRoute>
            } />
            <Route path="/meu-time" element={
              <ProtectedRoute><MeuTime /></ProtectedRoute>
            } />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
