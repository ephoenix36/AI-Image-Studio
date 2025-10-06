
import React from 'react';
import ReactDOM from 'react-dom/client';
import Studio from './Studio';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Studio />
  </React.StrictMode>
);
