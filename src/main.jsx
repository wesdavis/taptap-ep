import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from "@sentry/react"; // 🟢 1. Import Sentry
import App from './App.jsx'
import './index.css'

// 🟢 2. Initialize the Black Box
Sentry.init({
  dsn: "https://c069bab714c06751557ca46b832f8d1d@o4510873602490368.ingest.us.sentry.io/4510873608585216", // <--- PASTE YOUR KEY HERE
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of the transactions (Lower this if you get huge traffic)
  
  // Session Replay
  replaysSessionSampleRate: 0.1, // This records a video of 10% of user sessions
  replaysOnErrorSampleRate: 1.0, // This records a video if an error happens (100%)
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)