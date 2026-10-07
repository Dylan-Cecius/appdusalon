import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, type ReactNode } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import SubscriptionGuard from "./components/SubscriptionGuard";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { TransactionsProvider } from "@/contexts/TransactionsContext";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const POSPage = lazy(() => import("./pages/POSPage"));
const AgendaPage = lazy(() => import("./pages/AgendaPage"));
const TodoPage = lazy(() => import("./pages/TodoPage"));
const StatsPage = lazy(() => import("./pages/StatsPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const CATotalPage = lazy(() => import("./pages/CATotalPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const StaffPage = lazy(() => import("./pages/StaffPage"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const SMSPage = lazy(() => import("./pages/SMSPage"));
const StocksPage = lazy(() => import("./pages/StocksPage"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const ProduitsPage = lazy(() => import("./pages/ProduitsPage"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage"));
const TransactionHistory = lazy(() => import("./pages/TransactionHistory"));

const PageFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="text-center">
      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Chargement…</p>
    </div>
  </div>
);

const LazyPage = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<PageFallback />}>{children}</Suspense>
);

const AuthGuard = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageFallback />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

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
                <Route path="/auth" element={<LazyPage><Auth /></LazyPage>} />
                <Route path="/admin" element={<AuthGuard><LazyPage><Admin /></LazyPage></AuthGuard>} />
                <Route path="/booking/:salonSlug" element={<LazyPage><BookingPage /></LazyPage>} />

                <Route path="/" element={<AuthGuard><LazyPage><Dashboard /></LazyPage></AuthGuard>} />
                <Route path="/dashboard" element={<AuthGuard><LazyPage><Dashboard /></LazyPage></AuthGuard>} />

                <Route path="/pos" element={<AuthGuard><LazyPage><POSPage /></LazyPage></AuthGuard>} />
                <Route path="/clients" element={<AuthGuard><LazyPage><ClientsPage /></LazyPage></AuthGuard>} />
                <Route path="/equipe" element={<AuthGuard><LazyPage><StaffPage /></LazyPage></AuthGuard>} />
                <Route
                  path="/sms"
                  element={
                    <AuthGuard>
                      <SubscriptionGuard feature="canUseSmsAutomations">
                        <LazyPage><SMSPage /></LazyPage>
                      </SubscriptionGuard>
                    </AuthGuard>
                  }
                />
                <Route
                  path="/stocks"
                  element={
                    <AuthGuard>
                      <SubscriptionGuard feature="canManageInventory">
                        <LazyPage><StocksPage /></LazyPage>
                      </SubscriptionGuard>
                    </AuthGuard>
                  }
                />
                <Route path="/services" element={<AuthGuard><LazyPage><ServicesPage /></LazyPage></AuthGuard>} />
                <Route path="/produits" element={<AuthGuard><LazyPage><ProduitsPage /></LazyPage></AuthGuard>} />
                <Route path="/agenda" element={<AuthGuard><LazyPage><AgendaPage /></LazyPage></AuthGuard>} />
                <Route path="/todo" element={<AuthGuard><LazyPage><TodoPage /></LazyPage></AuthGuard>} />
                <Route path="/ca-total" element={<AuthGuard><LazyPage><CATotalPage /></LazyPage></AuthGuard>} />
                <Route path="/abonnement" element={<AuthGuard><LazyPage><SubscriptionPage /></LazyPage></AuthGuard>} />
                <Route path="/abonnements" element={<AuthGuard><LazyPage><SubscriptionPage /></LazyPage></AuthGuard>} />

                <Route
                  path="/stats"
                  element={
                    <AuthGuard>
                      <ProtectedRoute section="stats">
                        <LazyPage><StatsPage /></LazyPage>
                      </ProtectedRoute>
                    </AuthGuard>
                  }
                />
                <Route
                  path="/rapports"
                  element={
                    <AuthGuard>
                      <ProtectedRoute section="reports">
                        <SubscriptionGuard feature="canSendEmails">
                          <LazyPage><ReportsPage /></LazyPage>
                        </SubscriptionGuard>
                      </ProtectedRoute>
                    </AuthGuard>
                  }
                />
                <Route
                  path="/parametres"
                  element={
                    <AuthGuard>
                      <ProtectedRoute section="settings">
                        <LazyPage><SettingsPage /></LazyPage>
                      </ProtectedRoute>
                    </AuthGuard>
                  }
                />

                <Route path="/historique" element={<AuthGuard><LazyPage><TransactionHistory /></LazyPage></AuthGuard>} />
                <Route path="/encaissements" element={<AuthGuard><LazyPage><TransactionHistory /></LazyPage></AuthGuard>} />

                <Route path="*" element={<LazyPage><NotFound /></LazyPage>} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </TransactionsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
