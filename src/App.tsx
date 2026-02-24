import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import SelectCompany from "./pages/SelectCompany";
import Home from "./pages/Home";
import Triagem from "./pages/Triagem";
import BaseConhecimento from "./pages/BaseConhecimento";
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
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
