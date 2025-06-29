import van from 'vanjs-core'
import ragHelper from '../../../client/llm.md?raw'
import demo2dHtml from '../../public/demo-2d.html?raw'
import demo3dHtml from '../../public/demo-3d.html?raw'
import { appState } from '../state'
import { renderMarkdown } from '../utils/prism'
import { DebugPanel } from './Simulator/Simulator'
import { TabNav } from './TabNav'

const { div, h1, h2, h3, p, pre, code, a } = van.tags

interface DashboardProps {
  templates: {
    instructions: string
    networkTypes: string
    stateChangeDetector: string
  }
}

const demoEndpointUrl = (type: string) => {
  const endpoint = new URL(window.location.href)
  endpoint.pathname = ''
  const thisUrl = new URL(window.location.href)
  thisUrl.pathname = `/demo-${type}`
  thisUrl.searchParams.set('r', appState.roomName + `-${type}`)
  thisUrl.searchParams.set('e', endpoint.toString())
  return thisUrl.toString()
}

const generateUrls = (roomName: string) => ({
  http: `https://vibescale.benallfree.com`,
  ws: `wss://vibescale.benallfree.com/${roomName}/websocket`,
})

const generateRoomInstructions = (roomName: string, template: string) => {
  return template.replace(/\{\{roomName\}\}/g, roomName)
}

const DashboardContent = ({ templates }: DashboardProps) => {
  const urls = generateUrls(appState.roomName)
  const roomInstructions = generateRoomInstructions(appState.roomName, templates.instructions)

  const content = () => {
    switch (appState.activeTab) {
      case 'overview':
        return div(
          { class: 'p-8 space-y-6' },
          div(
            { class: 'space-y-4' },
            div(
              { class: 'space-y-2' },
              div({ class: 'font-semibold text-lg' }, 'HTTP Endpoint'),
              div({ class: 'bg-base-300 p-4 rounded-lg font-mono text-sm break-all' }, urls.http)
            )
          ),
          div(
            { class: 'space-y-4' },
            div(
              { class: 'font-semibold text-lg' },
              'Demo App (2D)',
              ' ',
              a(
                {
                  class: 'btn btn-primary ml-4 btn-sm',
                  target: '_blank',
                  href: demoEndpointUrl('2d'),
                },
                '🚀 Launch'
              ),
              a(
                {
                  class: 'btn btn-primary ml-4 btn-sm',
                  target: '_blank',
                  href: () => {
                    const demoUrl = demoEndpointUrl('2d')
                    const vibecheckUrl = new URL('https://vibecheck.benallfree.com')
                    vibecheckUrl.searchParams.set('url', demoUrl)
                    return vibecheckUrl.toString()
                  },
                },
                '🚀 Launch on Vibecheck'
              )
            ),
            div(
              { class: 'bg-base-300 rounded-lg p-6 overflow-auto max-h-[400px] border border-black' },
              (() => {
                const el = document.createElement('div')
                el.className = 'prose prose-invert max-w-none'
                el.innerHTML = renderMarkdown('```html\n' + demo2dHtml + '```')
                return el
              })()
            )
          ),
          div(
            { class: 'space-y-4' },
            div(
              { class: 'font-semibold text-lg' },
              'Demo App (3D)',
              ' ',
              a(
                {
                  class: 'btn btn-primary ml-4 btn-sm',
                  target: '_blank',
                  href: demoEndpointUrl('3d'),
                },
                '🚀 Launch'
              ),
              a(
                {
                  class: 'btn btn-primary ml-4 btn-sm',
                  target: '_blank',
                  href: () => {
                    const demoUrl = demoEndpointUrl('3d')
                    const vibecheckUrl = new URL('https://vibecheck.benallfree.com')
                    vibecheckUrl.searchParams.set('url', demoUrl)
                    return vibecheckUrl.toString()
                  },
                },
                '🚀 Launch on Vibecheck'
              )
            ),
            div(
              { class: 'bg-base-300 rounded-lg p-6 overflow-auto max-h-[400px] border border-black' },
              (() => {
                const el = document.createElement('div')
                el.className = 'prose prose-invert max-w-none'
                el.innerHTML = renderMarkdown('```html\n' + demo3dHtml + '```')
                return el
              })()
            )
          ),
          div(
            { class: 'space-y-4' },
            div({ class: 'font-semibold text-lg' }, 'RAG Helper'),
            div(
              { class: 'bg-base-300 rounded-lg p-6 overflow-auto max-h-[400px] border border-black' },
              pre({ class: 'language-markdown' }, code({ class: 'language-markdown' }, ragHelper))
            )
          )
        )
      case 'debug':
        return DebugPanel()
      default:
        return div()
    }
  }
  return div({ class: 'bg-base-200 rounded-lg min-h-[400px]' }, content)
}

export const Dashboard = ({ templates }: DashboardProps) =>
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
    DashboardContent({ templates })
  )
