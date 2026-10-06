import { useLocation, Link } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";

const TransactionHistory = lazy(() => import("@/pages/TransactionHistory"));

const NotFound = () => {
  const location = useLocation();
  const isHistoryFallback =
    location.pathname === "/historique" || location.pathname === "/encaissements";

  useEffect(() => {
    if (!isHistoryFallback) {
      console.error(
        "404 Error: User attempted to access non-existent route:",
        location.pathname
      );
    }
  }, [isHistoryFallback, location.pathname]);

  if (isHistoryFallback) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement…</div>}>
        <TransactionHistory />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="v2-panel max-w-md p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Erreur 404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Page introuvable</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Cette page n’existe pas ou a été déplacée.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
