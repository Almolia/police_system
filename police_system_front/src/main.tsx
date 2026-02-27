import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      {/* h-screen + overflow-hidden: Enforces a single-window fit.
          pb-12: Creates the mandatory bottom margin.
      */}
      <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden box-border relative">
        <App />
      </div>
    </AuthProvider>
  </StrictMode>,
)