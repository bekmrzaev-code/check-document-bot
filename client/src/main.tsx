import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// HashRouter keeps the route in the URL hash (e.g. /admin/#/drivers).
// On refresh the browser only requests /admin/ from the server, so the
// SPA is always served and the current page is preserved — no server-side
// catch-all needed. Works the same in dev (Vite) and prod (Express/Render).
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
