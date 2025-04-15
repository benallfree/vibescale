import van from 'vanjs-core'
import { appState } from '../state'

const { nav, ul, li, a } = van.tags

export const TabNav = () => {
  return nav(
    { class: 'tabs tabs-boxed bg-base-200 p-2 mb-6' },
    ul(
      { class: 'flex' },
      [{ id: 'overview', path: '', label: 'Install' }].map(({ id, path, label }) =>
        li(
          a(
            {
              href: () => `/${appState.roomName}${path}`,
              'data-navigo': true,
              class: () => `tab ${appState.activeTab === id ? 'tab-active' : ''}`,
            },
            label || id.charAt(0).toUpperCase() + id.slice(1)
          )
        )
      )
    )
  )
}
