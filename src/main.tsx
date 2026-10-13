import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { ThemeProvider } from "next-themes";

// Keep the standalone demo independent from authentication and production clients.
const Root = import.meta.env.VITE_PREVIEW_STANDALONE === 'true'
  ? React.lazy(() => import('./PreviewStandalone'))
  : React.lazy(() => import('./App'));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <React.Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Chargement du salon…</div>}>
        <Root />
      </React.Suspense>
    </ThemeProvider>
  </React.StrictMode>
);
