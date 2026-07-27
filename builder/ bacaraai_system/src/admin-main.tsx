import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AdminApp from './AdminApp.tsx';
import AppErrorBoundary from './components/AppErrorBoundary.tsx';
import './index.css';

const el = document.getElementById('root');
if (el) {
  createRoot(el).render(
    <StrictMode>
      <AppErrorBoundary>
        <AdminApp />
      </AppErrorBoundary>
    </StrictMode>,
  );
} else {
  console.error('[bacaraai-admin] #root not found');
}
