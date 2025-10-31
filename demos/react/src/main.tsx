import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LightEyeBoundary } from '@light-eye/react'

createRoot(document.getElementById('root')!).render(
  <LightEyeBoundary options={{ dsn: 'your dsn' }}>
    <App />
  </LightEyeBoundary>
)
