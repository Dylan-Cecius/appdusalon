import React from 'react';
import ReactDOM from 'react-dom/client';
import PreviewStandalone from './PreviewStandalone';
import './index.css';

// This entry imports only the synthetic-data demo. No auth or backend client.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PreviewStandalone />
  </React.StrictMode>,
);
