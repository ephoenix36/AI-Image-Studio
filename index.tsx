
import React from 'react';
import ReactDOM from 'react-dom/client';
import Studio from '@/Studio';
import { AppProvider } from '@/contexts/AppContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Add global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppProvider>
      <Studio />
    </AppProvider>
  </React.StrictMode>
);

