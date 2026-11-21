import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './theme.css';
import './landing.css';
import './brand.css';

// No StrictMode: its double-mount would open the camera twice in development.
createRoot(document.getElementById('root')!).render(<App />);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
