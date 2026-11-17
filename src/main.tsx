import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./lib/installPrompt"; // intercepte l'invitation d'installation dès le démarrage
import App from "./App";
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
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
