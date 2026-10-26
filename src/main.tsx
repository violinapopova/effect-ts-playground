import { createRoot } from 'react-dom/client'
import { App } from './App'
// Bundled with the app rather than loaded from Google Fonts, so the page looks the same with no network.
import '@fontsource-variable/inter/index.css'
import '@/styles/styles.css'

createRoot(document.getElementById('root')!).render(<App />)
