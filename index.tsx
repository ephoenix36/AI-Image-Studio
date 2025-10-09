
import React, { Component, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import Studio from './Studio';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

function showErrorOverlay(message: string) {
  const existing = document.getElementById('__dev_error_overlay');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = '__dev_error_overlay';
  el.style.cssText = 'position:fixed;inset:0;padding:24px;background:linear-gradient(180deg,#fff,#eee);color:#111;z-index:99999;overflow:auto;';
  el.innerHTML = `<h1 style="color:#b91c1c">Application error</h1><pre style="white-space:pre-wrap">${escapeHtml(message)}</pre>`;
  document.body.appendChild(el);
}

function escapeHtml(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// (setup below)

// Global handlers to catch errors that don't happen during render
let isDev = false;
try { isDev = Boolean((import.meta as any).env?.DEV); } catch (e) { isDev = false; }
if (isDev) {
  window.addEventListener('error', (e) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled error', e.error || e.message, e);
    try { showErrorOverlay((e.error && e.error.stack) || String(e.error || e.message)); } catch (err) { /* ignore */ }
  });
  window.addEventListener('unhandledrejection', (e) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled promise rejection', e.reason || e);
    try { showErrorOverlay(String((e.reason && e.reason.stack) || e.reason || e)); } catch (err) { /* ignore */ }
  });
}

const root = ReactDOM.createRoot(rootElement);
try {
  root.render(
    <React.StrictMode>
      <Studio />
    </React.StrictMode>
  );
} catch (err: any) {
  // Render-time errors
  // eslint-disable-next-line no-console
  console.error('Render error', err);
  if (isDev) showErrorOverlay(err && err.stack ? err.stack : String(err));
}
