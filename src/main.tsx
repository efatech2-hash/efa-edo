import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import { initPWAGlobalListener } from './hooks/usePWAInstall';

initPWAGlobalListener();
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);
