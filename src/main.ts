import { marked } from 'marked'
import Prism from 'prismjs'
import van from 'vanjs-core'

// Import components
import { ClipboardButton } from './ui/ClipboardButton'
import { Features } from './ui/Features'
import { Hero } from './ui/Hero'
import { RoomCreator } from './ui/RoomCreator'
import { TabNav } from './ui/TabNav'

// Import templates
import instructions from './templates/instructions.md?raw'
import networkTypes from './templates/network.ts?raw'
import stateChangeDetector from './templates/stateChangeDetector.ts?raw'

// Import additional Prism languages and styles
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-typescript'
import 'prismjs/themes/prism-tomorrow.css'
import './styles/prism.css'

const {
  div,
  header,
  section,
  h1,
  h2,
  h3,
  p,
  input,
  button,
  span,
  label,
  nav,
  ul,
  li,
  pre,
  code,
  g,
  rect,
  text,
  tspan,
} = van.tags

// Create SVG elements with proper namespace
const { svg, path } = van.tags('http://www.w3.org/2000/svg')

// Configure marked options with proper Prism integration
const renderer = new marked.Renderer()
renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  if (lang && Prism.languages[lang]) {
    const highlighted = Prism.highlight(text, Prism.languages[lang], lang)
    return `<pre><code class="language-${lang}">${highlighted}</code></pre>`
  }
  return `<pre><code>${text}</code></pre>`
}

marked.setOptions({
  renderer,
  gfm: true,
  breaks: true,
})

// App state
const appState = {
  roomName: van.state(''),
  isValid: van.state(false),
  currentView: van.state('home'),
  activeTab: van.state('overview'),
}

// Validation function
const validateRoomName = (value: string) => {
  const isValid = value.length > 0 && /^[a-zA-Z0-9-]+$/.test(value)
  appState.isValid.val = isValid
  return isValid
}

// Components
// RoomCreator has been moved to its own file

// Dashboard Components
const DashboardContent = () => {
  const generateUrls = (roomName: string) => ({
    http: `https://vibescale.benallfree.com/${roomName}`,
    ws: `wss://vibescale.benallfree.com/${roomName}`,
  })

  const generateRoomInstructions = (roomName: string): string => {
    return instructions.replace(/{{roomName}}/g, roomName)
  }

  const content = () => {
    const urls = generateUrls(appState.roomName.val)
    const roomInstructions = generateRoomInstructions(appState.roomName.val)

    switch (appState.activeTab.val) {
      case 'overview':
        return div(
          { class: 'p-8 space-y-6' },
          h2({ class: 'text-2xl font-bold mb-6' }, 'Endpoints'),
          div(
            { class: 'space-y-4' },
            div(
              { class: 'space-y-2' },
              div({ class: 'font-semibold text-lg' }, 'REST Endpoint'),
              div({ class: 'bg-base-300 p-4 rounded-lg font-mono text-sm break-all' }, urls.http)
            ),
            div(
              { class: 'space-y-2' },
              div({ class: 'font-semibold text-lg' }, 'WebSocket Endpoint'),
              div({ class: 'bg-base-300 p-4 rounded-lg font-mono text-sm break-all' }, urls.ws)
            )
          )
        )
      case 'rag':
        return div(
          { class: 'p-8 space-y-8' },
          // Introduction section
          div(
            { class: 'mb-8' },
            h2({ class: 'text-2xl font-bold mb-4' }, 'RAG (Retrieval-Augmented Generation) Integration'),
            p(
              { class: 'text-base-content/80 mb-4' },
              "This room comes with built-in RAG context that makes it easy to integrate with AI assistants. Below you'll find three essential resources for integrating with your Vibescale room:"
            )
          ),
          // API Documentation section
          div(
            { class: 'space-y-4' },
            div(
              { class: 'flex items-center gap-2' },
              h3({ class: 'text-xl font-semibold' }, 'API Documentation'),
              ClipboardButton({
                text: `Room URLs:\n${urls.http}\n${urls.ws}\n\nInstructions:\n${roomInstructions}`,
                title: 'Copy API Documentation',
              })
            ),
            p(
              { class: 'text-base-content/80' },
              'Complete documentation of the REST and WebSocket endpoints, including message types and connection flow.'
            ),
            div(
              { class: 'bg-base-300 rounded-lg p-6 overflow-auto max-h-[400px] border border-black' },
              (() => {
                const el = document.createElement('div')
                el.className = 'prose prose-invert max-w-none'
                el.innerHTML = marked(roomInstructions, { async: false })
                return el
              })()
            )
          ),
          // Network Types section
          div(
            { class: 'space-y-4' },
            div(
              { class: 'flex items-center gap-2' },
              h3({ class: 'text-xl font-semibold' }, 'Network Types'),
              ClipboardButton({
                text: networkTypes,
                title: 'Copy Network Types',
              })
            ),
            p(
              { class: 'text-base-content/80' },
              'TypeScript definitions for all network messages and data structures. Use these to ensure type safety in your client implementation.'
            ),
            div(
              { class: 'bg-base-300 rounded-lg p-6 overflow-auto max-h-[400px]' },
              (() => {
                const el = document.createElement('div')
                el.className = 'prose prose-invert max-w-none'
                el.innerHTML = marked('```typescript\n' + networkTypes + '\n```', { async: false })
                return el
              })()
            )
          ),
          // State Change Detector section
          div(
            { class: 'space-y-4' },
            div(
              { class: 'flex items-center gap-2' },
              h3({ class: 'text-xl font-semibold' }, 'State Change Detector'),
              ClipboardButton({
                text: stateChangeDetector,
                title: 'Copy State Change Detector',
              })
            ),
            p(
              { class: 'text-base-content/80' },
              'A utility to prevent network spam by only sending state updates when they exceed certain thresholds. This helps optimize network traffic in your game.'
            ),
            div(
              { class: 'bg-base-300 rounded-lg p-6 overflow-auto max-h-[400px]' },
              (() => {
                const el = document.createElement('div')
                el.className = 'prose prose-invert max-w-none'
                el.innerHTML = marked('```typescript\n' + stateChangeDetector + '\n```', { async: false })
                return el
              })()
            )
          )
        )
      case 'debug':
        return div({ class: 'p-4' }, 'Debug Content')
      default:
        return div()
    }
  }
  return div({ class: 'bg-base-200 rounded-lg min-h-[400px]' }, content)
}

const Dashboard = () =>
  div(
    { class: 'container mx-auto px-4 py-8' },
    div(
      { class: 'mb-8' },
      h1(
        { class: 'text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text' },
        () => `Room: ${appState.roomName.val}`
      )
    ),
    TabNav(appState),
    DashboardContent()
  )

// Main app
const App = () =>
  div({ id: 'app' }, () =>
    appState.currentView.val === 'home' ? div(Hero(), RoomCreator({ appState }), Features()) : Dashboard()
  )

// Initialize the app
van.add(document.body, App())

// Check for room parameter in URL
const urlParams = new URLSearchParams(window.location.search)
const roomFromUrl = urlParams.get('room')
if (roomFromUrl) {
  appState.roomName.val = roomFromUrl
  validateRoomName(roomFromUrl)
  if (appState.isValid.val) {
    appState.currentView.val = 'dashboard'
  }
}
