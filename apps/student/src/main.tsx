import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Validate required environment variables at startup
const requiredEnvVars = ['VITE_API_URL'] as const
const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !import.meta.env[envVar]
)

if (missingEnvVars.length > 0 && import.meta.env.PROD) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
