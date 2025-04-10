import Navigo from 'navigo'
import van from 'vanjs-core'
import * as vanX from 'vanjs-ext'

const { nav, ul, li, button } = van.tags

// Import the app state type from a new types file (we'll create this later)
interface AppState {
  activeTab: string
  roomName: string
  [key: string]: any
}

interface TabNavProps {
  appState: vanX.StateOf<AppState>
  router: Navigo
}

export const TabNav = ({ appState, router }: TabNavProps) => {
  const handleTabClick = (path: string) => {
    const baseUrl = `/${appState.roomName.val}`
    const targetUrl = path ? `${baseUrl}${path}` : baseUrl
    router.navigate(targetUrl)
  }

  return nav(
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
              onclick: () => handleTabClick(path),
            },
            id.charAt(0).toUpperCase() + id.slice(1)
          )
        )
      )
    )
  )
}
