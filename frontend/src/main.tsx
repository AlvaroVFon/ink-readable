import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import './index.css'
import App from './App.tsx'
import { EditorConfigProvider } from './components/editor-config/editor-config-context'
import { ThemeProvider } from './components/theme/theme-provider'

const root = document.getElementById('root')
if (!root) {
  throw new Error('Root element not found')
}

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <EditorConfigProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </EditorConfigProvider>
    </ThemeProvider>
  </StrictMode>,
)
