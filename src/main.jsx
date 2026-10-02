import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/plus-jakarta-sans' // Schrift lokal ausgeliefert (kein Google-Server, DSGVO)
import './index.css'

// Ein Build, zwei Apps: Gäste-Menü unter "/", Personal-Bereich unter "/admin".
// Dank lazy() lädt ein Gast-Handy den Admin-Code nie.
const isAdmin = window.location.pathname.startsWith('/admin')
const App = lazy(() =>
  isAdmin ? import('./admin/AdminApp.jsx') : import('./guest/GuestApp.jsx')
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </StrictMode>
)
