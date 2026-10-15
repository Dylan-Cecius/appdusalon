import React from 'react';
import ReactDOM from 'react-dom/client';
import PreviewStandalone from './PreviewStandalone';
import './index.css';
import { MobileViewport } from './components/MobileViewport';
import MobileAppointmentDemo from './components/MobileAppointmentDemo';
import MobileCartDemo from './components/MobileCartDemo';

// This entry imports only the synthetic-data demo. No auth or backend client.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MobileViewport>{new URLSearchParams(location.search).get('mobile-appointment') === '1' ? <MobileAppointmentDemo /> : new URLSearchParams(location.search).get('mobile-cart') === '1' ? <MobileCartDemo /> : <PreviewStandalone />}</MobileViewport>
  </React.StrictMode>,
);
