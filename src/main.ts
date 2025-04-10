import { marked } from 'marked'
import Prism from 'prismjs'
import van from 'vanjs-core'
import * as vanX from 'vanjs-ext'

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

const { div, header, section, h1, h2, h3, p, input, button, span, label, nav, ul, li, pre, code } = van.tags

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
const appState = vanX.reactive({
  roomName: '',
  isValid: false,
  currentView: 'home',
  activeTab: 'overview',
})

// Validation function
const validateRoomName = (value: string) => {
  const isValid = value.length > 0 && /^[a-zA-Z0-9-]+$/.test(value)
  appState.isValid = isValid
  return isValid
}

// Components
const Hero = () =>
  header(
    { class: 'container mx-auto px-4 py-8 text-center' },
    h1(
      { class: 'text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text' },
      'Vibescale'
    ),
    p({ class: 'text-2xl mb-8 text-gray-300' }, 'Build MMO games without the backend hassle')
  )

const RoomCreator = () => {
  const validationIndicator = () =>
    div(
      {
        id: 'validationIndicator',
        class: () => `absolute right-4 top-1/2 -translate-y-1/2 text-error ${appState.isValid ? 'hidden' : ''}`,
      },
      '✕'
    )

  return section(
    { class: 'container mx-auto px-4 py-8' },
    div(
      { class: 'max-w-md mx-auto' },
      div(
        { class: 'card bg-gradient-to-br from-base-300 to-base-200 shadow-2xl border border-base-300' },
        div(
          { class: 'card-body p-8' },
          div(
            { class: 'text-center space-y-3' },
            h1(
              {
                class: 'text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text',
              },
              'Create Your MMO Room'
            ),
            p({ class: 'text-sm text-gray-400' }, 'Generate a unique room for your multiplayer game')
          ),
          div(
            { class: 'form-control mt-8' },
            label(
              { class: 'label pb-3' },
              span({ class: 'label-text font-medium' }, 'Room Name'),
              span({ class: 'label-text-alt text-gray-400' }, 'Alphanumeric characters only')
            ),
            div(
              { class: 'input-group input-group-lg relative' },
              input({
                type: 'text',
                id: 'roomNameInput',
                placeholder: 'my-awesome-game',
                class:
                  'input input-bordered w-full bg-base-100 focus:ring-2 focus:ring-primary transition-all duration-200 px-6 py-4',
                oninput: (e: Event) => {
                  const input = e.target as HTMLInputElement
                  input.value = input.value.replace(/[^a-zA-Z0-9-]/g, '')
                  appState.roomName = input.value
                  validateRoomName(input.value)
                },
              }),
              validationIndicator(),
              button(
                {
                  id: 'generateButton',
                  class: () =>
                    `btn btn-primary hover:brightness-110 transition-all duration-200 px-6 mt-4 ${!appState.isValid ? 'btn-disabled' : ''}`,
                  onclick: () => {
                    if (!appState.isValid) return
                    // Update URL with room parameter
                    const url = new URL(window.location.href)
                    url.searchParams.set('room', appState.roomName)
                    window.history.pushState({}, '', url)
                    // Update view state to dashboard
                    appState.currentView = 'dashboard'
                  },
                },
                span({ class: 'mr-1' }, '＋'),
                'Create'
              )
            )
          )
        )
      )
    )
  )
}

const Features = () =>
  section(
    { class: 'container mx-auto px-4 py-16' },
    div(
      { class: 'grid md:grid-cols-3 gap-8' },
      div(
        { class: 'card bg-base-200' },
        div(
          { class: 'card-body' },
          h1({ class: 'card-title' }, 'Instant WebSocket Server'),
          p({}, 'Ready-to-use WebSocket server for real-time multiplayer functionality')
        )
      ),
      div(
        { class: 'card bg-base-200' },
        div(
          { class: 'card-body' },
          h1({ class: 'card-title' }, 'AI-Ready Context'),
          p({}, 'LLM-friendly RAG context for seamless AI integration')
        )
      ),
      div(
        { class: 'card bg-base-200' },
        div(
          { class: 'card-body' },
          h1({ class: 'card-title' }, 'Zero Backend Deploy'),
          p({}, 'Focus on your game logic - we handle all the infrastructure')
        )
      )
    )
  )

// Dashboard Components
const TabNav = () =>
  nav(
    { class: 'tabs tabs-boxed bg-base-200 p-2 mb-6' },
    ul(
      { class: 'flex' },
      ['overview', 'rag', 'debug'].map((tab) =>
        li(
          button(
            {
              class: () => `tab ${appState.activeTab === tab ? 'tab-active' : ''}`,
              onclick: () => (appState.activeTab = tab),
            },
            tab.charAt(0).toUpperCase() + tab.slice(1)
          )
        )
      )
    )
  )

const DashboardContent = () => {
  const generateUrls = (roomName: string) => ({
    http: `https://vibescale.benallfree.com/${roomName}`,
    ws: `wss://vibescale.benallfree.com/${roomName}`,
  })

  const generateRoomInstructions = (roomName: string): string => {
    return instructions.replace(/{{roomName}}/g, roomName)
  }

  const content = () => {
    switch (appState.activeTab) {
      case 'overview':
        const urls = generateUrls(appState.roomName)
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
        const roomInstructions = generateRoomInstructions(appState.roomName)
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
            h3({ class: 'text-xl font-semibold' }, 'API Documentation'),
            p(
              { class: 'text-base-content/80' },
              'Complete documentation of the REST and WebSocket endpoints, including message types and connection flow.'
            ),
            div(
              { class: 'flex gap-4' },
              button(
                {
                  class: 'btn btn-primary',
                  onclick: (e: Event) => {
                    const btn = e.target as HTMLButtonElement
                    const urls = generateUrls(appState.roomName)
                    const textToCopy = `Room URLs:\n${urls.http}\n${urls.ws}\n\nInstructions:\n${roomInstructions}`
                    navigator.clipboard.writeText(textToCopy)
                    btn.textContent = 'Copied!'
                    setTimeout(() => {
                      btn.textContent = 'Copy URLs + Instructions'
                    }, 2000)
                  },
                },
                'Copy URLs + Instructions'
              ),
              button(
                {
                  class: 'btn btn-outline',
                  onclick: (e: Event) => {
                    const btn = e.target as HTMLButtonElement
                    navigator.clipboard.writeText(roomInstructions)
                    btn.textContent = 'Copied!'
                    setTimeout(() => {
                      btn.textContent = 'Copy Instructions'
                    }, 2000)
                  },
                },
                'Copy Instructions'
              )
            ),
            div(
              { class: 'bg-base-300 rounded-lg p-6 overflow-auto max-h-[400px]' },
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
            h3({ class: 'text-xl font-semibold' }, 'Network Types'),
            p(
              { class: 'text-base-content/80' },
              'TypeScript definitions for all network messages and data structures. Use these to ensure type safety in your client implementation.'
            ),
            button(
              {
                class: 'btn btn-outline',
                onclick: (e: Event) => {
                  const btn = e.target as HTMLButtonElement
                  navigator.clipboard.writeText(networkTypes)
                  btn.textContent = 'Copied!'
                  setTimeout(() => {
                    btn.textContent = 'Copy Network Types'
                  }, 2000)
                },
              },
              'Copy Network Types'
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
            h3({ class: 'text-xl font-semibold' }, 'State Change Detector'),
            p(
              { class: 'text-base-content/80' },
              'A utility to prevent network spam by only sending state updates when they exceed certain thresholds. This helps optimize network traffic in your game.'
            ),
            button(
              {
                class: 'btn btn-outline',
                onclick: (e: Event) => {
                  const btn = e.target as HTMLButtonElement
                  navigator.clipboard.writeText(stateChangeDetector)
                  btn.textContent = 'Copied!'
                  setTimeout(() => {
                    btn.textContent = 'Copy State Change Detector'
                  }, 2000)
                },
              },
              'Copy State Change Detector'
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
        () => `Room: ${appState.roomName}`
      )
    ),
    TabNav(),
    DashboardContent()
  )

// Main app
const App = () =>
  div({ id: 'app' }, () => (appState.currentView === 'home' ? div(Hero(), RoomCreator(), Features()) : Dashboard()))

// Initialize the app
van.add(document.body, App())

// Check for room parameter in URL
const urlParams = new URLSearchParams(window.location.search)
const roomFromUrl = urlParams.get('room')
if (roomFromUrl) {
  appState.roomName = roomFromUrl
  validateRoomName(roomFromUrl)
  if (appState.isValid) {
    appState.currentView = 'dashboard'
  }
}
