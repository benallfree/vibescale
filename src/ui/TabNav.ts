import van from 'vanjs-core'
import * as vanX from 'vanjs-ext'

const { nav, ul, li, button } = van.tags

// Import the app state type from a new types file (we'll create this later)
interface AppState {
  activeTab: string
  roomName: string
  [key: string]: any
}

export const TabNav = (appState: vanX.StateOf<AppState>) =>
  nav(
    { class: 'tabs tabs-boxed bg-base-200 p-2 mb-6' },
    ul(
      { class: 'flex' },
      [
        { id: 'overview', path: '' },
        { id: 'rag', path: '/rag' },
        { id: 'debug', path: '/debug' },
      ].map(({ id, path }) =>
        li(
          button(
            {
              class: () => `tab ${appState.activeTab.val === id ? 'tab-active' : ''}`,
              onclick: () => {
                const baseUrl = `/${appState.roomName.val}`
                window.location.href = path ? `${baseUrl}${path}` : baseUrl
              },
            },
            id.charAt(0).toUpperCase() + id.slice(1)
          )
        )
      )
    )
  )
