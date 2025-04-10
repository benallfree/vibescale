import van from 'vanjs-core'
import * as vanX from 'vanjs-ext'

const { div, header, section, h1, p, input, button, span, label, nav, ul, li } = van.tags

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
  const content = () => {
    switch (appState.activeTab) {
      case 'overview':
        return div({ class: 'p-4' }, 'Overview Content')
      case 'rag':
        return div({ class: 'p-4' }, 'RAG Content')
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
