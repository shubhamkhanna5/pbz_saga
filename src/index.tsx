import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { DialogProvider } from './components/ui/DialogProvider';

// Register Service Worker for Progressive Web App capabilities
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('PBZ PWA Service Worker registered with scope: ', reg.scope))
      .catch(err => console.error('PBZ PWA Service Worker registration failed: ', err));
  });
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <DialogProvider>
      <App />
    </DialogProvider>
  </React.StrictMode>
);
