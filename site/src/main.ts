import van from 'vanjs-core'

// Import components
import { initRouter } from './router'
import { appState } from './state'
import { Navbar } from './ui/Navbar'

// Import templates
import networkTypes from './server/types.ts?raw'
import instructions from './templates/instructions.md?raw'

// Import Prism.js core and additional languages
import 'prismjs'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-typescript'
import 'prismjs/themes/prism-tomorrow.css'
import './styles/prism.css'

const { div } = van.tags

// Initialize the router first
const router = initRouter({
  instructions,
  networkTypes,
})

// Create app container with conditional navbar
const appContainer = div(
  { id: 'app' },
  div({}, [() => (appState.currentView !== 'home' ? Navbar() : ''), div({ id: 'content' })])
)
document.body.appendChild(appContainer)

// Start the router
router.resolve()
