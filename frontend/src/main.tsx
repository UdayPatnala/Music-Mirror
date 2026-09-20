import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { serviceWorkerManager } from './services/ServiceWorkerManager'

// Initialize PWA ServiceWorker for offline shell & audio stream caching
if (process.env.NODE_ENV === 'production' || typeof window !== 'undefined') {
  serviceWorkerManager.register().catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

