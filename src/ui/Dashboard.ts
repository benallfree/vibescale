import van, { State } from 'vanjs-core'
import { renderMarkdown } from '../utils/prism'
import { ClipboardButton } from './ClipboardButton'
import { TabNav } from './TabNav'

const { div, h1, h2, h3, p } = van.tags

interface DashboardProps {
  appState: {
    roomName: State<string>
    activeTab: State<string>
  }
  templates: {
    instructions: string
    networkTypes: string
    stateChangeDetector: string
  }
}

const generateUrls = (roomName: string) => ({
  http: `https://vibescale.benallfree.com/${roomName}`,
  ws: `wss://vibescale.benallfree.com/${roomName}`,
})

const generateRoomInstructions = (roomName: string, instructions: string): string => {
  return instructions.replace(/{{roomName}}/g, roomName)
}

const DashboardContent = ({ appState, templates }: DashboardProps) => {
  const urls = generateUrls(appState.roomName.val)
  const roomInstructions = generateRoomInstructions(appState.roomName.val, templates.instructions)

  const content = () => {
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
                el.innerHTML = renderMarkdown(roomInstructions)
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
                text: templates.networkTypes,
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
                el.innerHTML = renderMarkdown(templates.networkTypes, 'typescript')
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
                text: templates.stateChangeDetector,
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
                el.innerHTML = renderMarkdown(templates.stateChangeDetector, 'typescript')
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

export const Dashboard = ({ appState, templates }: DashboardProps) =>
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
    DashboardContent({ appState, templates })
  )
