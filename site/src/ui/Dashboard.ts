import van from 'vanjs-core'
import { appState } from '../state'
import { renderMarkdown } from '../utils/prism'
import { ClipboardButton } from './ClipboardButton'
import { DebugPanel } from './DebugPanel'
import { TabNav } from './TabNav'

const { div, h1, h2, h3, p } = van.tags

interface DashboardProps {
  templates: {
    instructions: string
    networkTypes: string
    stateChangeDetector: string
  }
}

const generateUrls = (roomName: string) => ({
  http: `https://vibescale.benallfree.com/${roomName}`,
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
            h2({ class: 'text-2xl font-bold mb-4' }, 'LLM Integration Guide'),
            p(
              { class: 'text-base-content/80 mb-4' },
              "This room comes with built-in LLM context that makes it easy to integrate with AI assistants. Below you'll find the essential documentation for integrating with your Vibescale room:"
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
                el.innerHTML = renderMarkdown(roomInstructions)
                return el
              })()
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
