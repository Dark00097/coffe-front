import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const isAdminOrStaffRoute = () => {
  const path = window.location.pathname;
  return path.startsWith('/admin') || path.startsWith('/staff');
};

// Global error handlers for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  if (isAdminOrStaffRoute()) {
    toast.error('Une erreur inattendue est survenue : ' + (event.reason?.message || 'Erreur inconnue'));
  }
});

// Global error handler for JavaScript errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.message, event.filename, event.lineno);
  if (isAdminOrStaffRoute()) {
    toast.error('Une erreur JavaScript est survenue : ' + event.message);
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
