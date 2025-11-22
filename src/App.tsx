import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import POSPage from "./pages/POSPage";
import AgendaPage from "./pages/AgendaPage";
import TodoPage from "./pages/TodoPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import StatsPage from "./pages/StatsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import ProtectedRoute from "./components/ProtectedRoute";

const TransactionHistory = lazy(() => import("./pages/TransactionHistory"));

import { AuthProvider } from '@/hooks/useAuth';
import { TransactionsProvider } from '@/contexts/TransactionsContext';

// Global state management with TransactionsProvider
const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TransactionsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin" element={<Admin />} />
                
                {/* Routes principales */}
                <Route path="/pos" element={<POSPage />} />
                <Route path="/agenda" element={<AgendaPage />} />
                <Route path="/todo" element={<TodoPage />} />
                <Route path="/abonnements" element={<SubscriptionPage />} />
                
                {/* Routes protégées par mot de passe */}
                <Route 
                  path="/stats" 
                  element={
                    <ProtectedRoute section="stats">
                      <StatsPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/rapports" 
                  element={
                    <ProtectedRoute section="reports">
                      <ReportsPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/parametres" 
                  element={
                    <ProtectedRoute section="settings">
                      <SettingsPage />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Routes historiques */}
                <Route path="/historique" element={<Suspense fallback={<div className="p-8">Chargement…</div>}><TransactionHistory /></Suspense>} />
                <Route path="/encaissements" element={<Suspense fallback={<div className="p-8">Chargement…</div>}><TransactionHistory /></Suspense>} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </TransactionsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
