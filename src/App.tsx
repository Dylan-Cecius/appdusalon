import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import POSPage from "./pages/POSPage";
import AgendaPage from "./pages/AgendaPage";
import TodoPage from "./pages/TodoPage";

import StatsPage from "./pages/StatsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import ClientsPage from "./pages/ClientsPage";
import StaffPage from "./pages/StaffPage";
import BookingPage from "./pages/BookingPage";
import SMSPage from "./pages/SMSPage";
import StocksPage from "./pages/StocksPage";
import ProtectedRoute from "./components/ProtectedRoute";

const TransactionHistory = lazy(() => import("./pages/TransactionHistory"));

import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { TransactionsProvider } from '@/contexts/TransactionsContext';

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

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
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/booking/:salonSlug" element={<BookingPage />} />
                
                <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
                <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
                
                {/* Routes principales */}
                <Route path="/pos" element={<AuthGuard><POSPage /></AuthGuard>} />
                <Route path="/clients" element={<AuthGuard><ClientsPage /></AuthGuard>} />
                <Route path="/equipe" element={<AuthGuard><StaffPage /></AuthGuard>} />
                <Route path="/sms" element={<AuthGuard><SMSPage /></AuthGuard>} />
                <Route path="/stocks" element={<AuthGuard><StocksPage /></AuthGuard>} />
                <Route path="/agenda" element={<AuthGuard><AgendaPage /></AuthGuard>} />
                <Route path="/todo" element={<AuthGuard><TodoPage /></AuthGuard>} />
                <Route path="/abonnement" element={<Navigate to="/dashboard" replace />} />
                <Route path="/abonnements" element={<Navigate to="/dashboard" replace />} />
                
                {/* Routes protégées par mot de passe */}
                <Route 
                  path="/stats" 
                  element={
                    <AuthGuard>
                      <ProtectedRoute section="stats">
                        <StatsPage />
                      </ProtectedRoute>
                    </AuthGuard>
                  } 
                />
                <Route 
                  path="/rapports" 
                  element={
                    <AuthGuard>
                      <ProtectedRoute section="reports">
                        <ReportsPage />
                      </ProtectedRoute>
                    </AuthGuard>
                  } 
                />
                <Route 
                  path="/parametres" 
                  element={
                    <AuthGuard>
                      <ProtectedRoute section="settings">
                        <SettingsPage />
                      </ProtectedRoute>
                    </AuthGuard>
                  } 
                />
                
                {/* Routes historiques */}
                <Route path="/historique" element={<AuthGuard><Suspense fallback={<div className="p-8">Chargement…</div>}><TransactionHistory /></Suspense></AuthGuard>} />
                <Route path="/encaissements" element={<AuthGuard><Suspense fallback={<div className="p-8">Chargement…</div>}><TransactionHistory /></Suspense></AuthGuard>} />
                
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
