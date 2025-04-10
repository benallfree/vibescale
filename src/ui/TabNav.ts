import van from 'vanjs-core'
import * as vanX from 'vanjs-ext'

const { nav, ul, li, button } = van.tags

// Import the app state type from a new types file (we'll create this later)
interface AppState {
  activeTab: string
  [key: string]: any
}

export const TabNav = (appState: vanX.StateOf<AppState>) =>
  nav(
    { class: 'tabs tabs-boxed bg-base-200 p-2 mb-6' },
    ul(
      { class: 'flex' },
      ['overview', 'rag', 'debug'].map((tab) =>
        li(
          button(
            {
              class: () => `tab ${appState.activeTab.val === tab ? 'tab-active' : ''}`,
              onclick: () => (appState.activeTab.val = tab),
            },
            tab.charAt(0).toUpperCase() + tab.slice(1)
          )
        )
      )
    )
  )
