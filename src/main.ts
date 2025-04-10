import van from 'vanjs-core'

// Import components
import { initRouter } from './router'
import { Navbar } from './ui/Navbar'

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

// Initialize the router first
const router = initRouter(appState, {
  instructions,
  networkTypes,
  stateChangeDetector,
})

// Create app container with conditional navbar
const appContainer = div(
  { id: 'app' },
  div(
    {
      class: () => (appState.currentView.val === 'home' ? '' : 'mt-16'),
    },
    [() => (appState.currentView.val !== 'home' ? Navbar({ router }) : ''), div({ id: 'content' })]
  )
)
document.body.appendChild(appContainer)

// Start the router
router.resolve()
