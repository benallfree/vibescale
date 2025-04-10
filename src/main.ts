import van from 'vanjs-core'

// Import components
import { initRouter } from './router'

// Import templates
import instructions from './templates/instructions.md?raw'
import networkTypes from './templates/network.ts?raw'
import stateChangeDetector from './templates/stateChangeDetector.ts?raw'

// Import Prism.js core and additional languages
import 'prismjs'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-typescript'
import 'prismjs/themes/prism-tomorrow.css'
import './styles/prism.css'

const { div } = van.tags

// App state
const appState = {
  roomName: van.state(''),
  isValid: van.state(false),
  currentView: van.state('home'),
  activeTab: van.state('overview'),
}

// Create app container
const appContainer = div({ id: 'app' })
document.body.appendChild(appContainer)

// Initialize the router
const router = initRouter(appState, {
  instructions,
  networkTypes,
  stateChangeDetector,
})

// Start the router
router.resolve()
