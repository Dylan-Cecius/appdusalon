import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import PreviewStandalone from "./PreviewStandalone";
import { ThemeProvider } from "next-themes";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {import.meta.env.VITE_PREVIEW_STANDALONE === 'true' ? <PreviewStandalone /> : <App />}
    </ThemeProvider>
  </React.StrictMode>
);
