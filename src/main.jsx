import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CRMApp from './CRMManager.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CRMApp />
  </StrictMode>,
)
