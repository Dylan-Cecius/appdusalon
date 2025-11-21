import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

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
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin" element={<Admin />} />
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
