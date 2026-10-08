import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import SubscriptionGuard from "./components/SubscriptionGuard";
import PermissionGuard from "./components/PermissionGuard";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useSubscriptionRights } from "@/hooks/useSubscriptionRights";
import { TransactionsProvider } from "@/contexts/TransactionsContext";
import { isAllowedPreviewUser, isDemoOnlyPreview } from "@/lib/previewSafety";
import { supabase } from "@/integrations/supabase/client";

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

const PreviewExternalActionGuard = ({ children }: { children: ReactNode }) =>
  isDemoOnlyPreview ? <Navigate to="/dashboard" replace /> : <>{children}</>;

const AuthGuard = ({ children }: { children: ReactNode }) => {
  const { user, loading, signOut } = useAuth();
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const {
    subscriptionTier,
    loading: subscriptionLoading,
  } = useSubscriptionRights();
  const [mfaChecked, setMfaChecked] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkMfa = async () => {
      if (!user) {
        if (!cancelled) {
          setMfaRequired(false);
          setMfaChecked(true);
        }
        return;
      }

      setMfaChecked(false);

      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (cancelled) return;

      if (error) {
        console.error('[AuthGuard] MFA assurance check failed:', error);
        setMfaRequired(true);
        setMfaChecked(true);
        return;
      }

      setMfaRequired(
        data?.nextLevel === 'aal2' && data?.currentLevel !== 'aal2'
      );
      setMfaChecked(true);
    };

    void checkMfa();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading || (user && (!mfaChecked || permissionsLoading || subscriptionLoading))) {
    return <PageFallback />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAllowedPreviewUser(user.email)) {
    void signOut();
    return <Navigate to="/auth" replace />;
  }

  if (mfaRequired) {
    return <Navigate to="/auth?mfa=required" replace />;
  }

  const employeeAccessUnavailable =
    permissions.role === 'employee' &&
    (
      !permissions.employeeId ||
      !['Equipe', 'Lifetime'].includes(subscriptionTier)
    );

  if (employeeAccessUnavailable) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Accès employé indisponible</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            L’accès des employés nécessite un plan Équipe actif et un compte employé autorisé par le salon.
          </p>
          <button
            type="button"
            onClick={() => signOut()}
            className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
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
                <Route
                  path="/booking/:salonSlug"
                  element={
                    isDemoOnlyPreview
                      ? <Navigate to="/auth" replace />
                      : <LazyPage><BookingPage /></LazyPage>
                  }
                />

                <Route path="/" element={<AuthGuard><LazyPage><Dashboard /></LazyPage></AuthGuard>} />
                <Route path="/dashboard" element={<AuthGuard><LazyPage><Dashboard /></LazyPage></AuthGuard>} />

                <Route path="/pos" element={<AuthGuard><LazyPage><POSPage /></LazyPage></AuthGuard>} />
                <Route path="/clients" element={<AuthGuard><LazyPage><ClientsPage /></LazyPage></AuthGuard>} />
                <Route
                  path="/equipe"
                  element={
                    <AuthGuard>
                      <PermissionGuard permission="canAccessEmployeeManagement">
                        <LazyPage><StaffPage /></LazyPage>
                      </PermissionGuard>
                    </AuthGuard>
                  }
                />
                <Route
                  path="/sms"
                  element={
                    <AuthGuard>
                      <PermissionGuard permission="canAccessSettings">
                        <SubscriptionGuard feature="canUseSmsAutomations">
                          <PreviewExternalActionGuard>
                            <LazyPage><SMSPage /></LazyPage>
                          </PreviewExternalActionGuard>
                        </SubscriptionGuard>
                      </PermissionGuard>
                    </AuthGuard>
                  }
                />
                <Route
                  path="/stocks"
                  element={
                    <AuthGuard>
                      <PermissionGuard permission="canAccessSettings">
                        <SubscriptionGuard feature="canManageInventory">
                          <LazyPage><StocksPage /></LazyPage>
                        </SubscriptionGuard>
                      </PermissionGuard>
                    </AuthGuard>
                  }
                />
                <Route path="/services" element={<AuthGuard><LazyPage><ServicesPage /></LazyPage></AuthGuard>} />
                <Route
                  path="/produits"
                  element={
                    <AuthGuard>
                      <PermissionGuard permission="canAccessSettings">
                        <SubscriptionGuard feature="canManageInventory">
                          <LazyPage><ProduitsPage /></LazyPage>
                        </SubscriptionGuard>
                      </PermissionGuard>
                    </AuthGuard>
                  }
                />
                <Route path="/agenda" element={<AuthGuard><LazyPage><AgendaPage /></LazyPage></AuthGuard>} />
                <Route path="/todo" element={<AuthGuard><LazyPage><TodoPage /></LazyPage></AuthGuard>} />
                <Route
                  path="/ca-total"
                  element={
                    <AuthGuard>
                      <PermissionGuard permission="canManageTransactions">
                        <LazyPage><CATotalPage /></LazyPage>
                      </PermissionGuard>
                    </AuthGuard>
                  }
                />
                <Route
                  path="/abonnement"
                  element={
                    <AuthGuard>
                      <PermissionGuard permission="canAccessSettings">
                        <PreviewExternalActionGuard>
                          <LazyPage><SubscriptionPage /></LazyPage>
                        </PreviewExternalActionGuard>
                      </PermissionGuard>
                    </AuthGuard>
                  }
                />
                <Route
                  path="/abonnements"
                  element={
                    <AuthGuard>
                      <PermissionGuard permission="canAccessSettings">
                        <PreviewExternalActionGuard>
                          <LazyPage><SubscriptionPage /></LazyPage>
                        </PreviewExternalActionGuard>
                      </PermissionGuard>
                    </AuthGuard>
                  }
                />

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
                      <PermissionGuard permission="canAccessReports">
                        <ProtectedRoute section="reports">
                          <SubscriptionGuard feature="canExportReports">
                            <PreviewExternalActionGuard>
                              <LazyPage><ReportsPage /></LazyPage>
                            </PreviewExternalActionGuard>
                          </SubscriptionGuard>
                        </ProtectedRoute>
                      </PermissionGuard>
                    </AuthGuard>
                  }
                />
                <Route
                  path="/parametres"
                  element={
                    <AuthGuard>
                      <PermissionGuard permission="canAccessSettings">
                        <ProtectedRoute section="settings">
                          <LazyPage><SettingsPage /></LazyPage>
                        </ProtectedRoute>
                      </PermissionGuard>
                    </AuthGuard>
                  }
                />

                <Route
                  path="/historique"
                  element={
                    <AuthGuard>
                      <PermissionGuard permission="canManageTransactions">
                        <LazyPage><TransactionHistory /></LazyPage>
                      </PermissionGuard>
                    </AuthGuard>
                  }
                />
                <Route
                  path="/encaissements"
                  element={
                    <AuthGuard>
                      <PermissionGuard permission="canManageTransactions">
                        <LazyPage><TransactionHistory /></LazyPage>
                      </PermissionGuard>
                    </AuthGuard>
                  }
                />

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
