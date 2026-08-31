import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Restore a deep link that GitHub Pages bounced through /404.html
try {
  const redirect = sessionStorage.getItem('wavesign:redirect');
  if (redirect) {
    sessionStorage.removeItem('wavesign:redirect');
    window.history.replaceState(null, '', '/admin' + redirect);
  }
} catch {
  /* sessionStorage unavailable — ignore */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
