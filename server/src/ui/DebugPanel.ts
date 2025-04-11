import van from 'vanjs-core'
import { reactive } from 'vanjs-ext'
import { createRoom, DebugEvent, type PlayerComplete } from 'vibescale'
import { appState } from '../state'

const { div, h2, pre, code } = van.tags

interface DebugState {
  history: string[]
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  playerId: string | null
}

export const DebugPanel = () => {
  // Create state
  const debugState = reactive<DebugState>({
    history: [],
    connectionStatus: 'connecting',
    playerId: null,
  })

  // Connect to room using client library
  const room = createRoom<{}, {}>(appState.roomName, { endpoint: '' })

  // Connection events
  room.on('connected', () => {
    const timestamp = new Date().toISOString()
    debugState.connectionStatus = 'connected'
    debugState.history = [...debugState.history, `[${timestamp}] Connected to room`]
  })

  room.on('disconnected', () => {
    const timestamp = new Date().toISOString()
    debugState.connectionStatus = 'disconnected'
    debugState.playerId = null
    debugState.history = [...debugState.history, `[${timestamp}] Disconnected from room`]
  })

  // Debug events
  room.on('debug', (event: DebugEvent) => {
    const { type, data } = event
    const timestamp = new Date().toISOString()
    let message = `[${timestamp}] ${type}`
    if (data) {
      message += `\n${JSON.stringify(data)}`
    }

    debugState.history = [...debugState.history, message]
  })

  // Player events
  room.on('playerJoin', (player: PlayerComplete<{}, {}>) => {
    if (!debugState.playerId) {
      debugState.playerId = player.id
    }
    const timestamp = new Date().toISOString()
    debugState.history = [...debugState.history, `[${timestamp}] Player joined: ${player.id}`]
  })

  room.on('playerLeave', (player: PlayerComplete<{}, {}>) => {
    const timestamp = new Date().toISOString()
    debugState.history = [...debugState.history, `[${timestamp}] Player left: ${player.id}`]
  })

  room.on('playerUpdate', (player: PlayerComplete<{}, {}>) => {
    const timestamp = new Date().toISOString()
    debugState.history = [...debugState.history, `[${timestamp}] Player updated: ${player.id}`]
  })

  // Error events
  room.on('error', (error: string) => {
    const timestamp = new Date().toISOString()
    debugState.history = [...debugState.history, `[${timestamp}] ! Error: ${error}`]
    debugState.connectionStatus = 'disconnected'
  })

  // Cleanup
  window.addEventListener('beforeunload', () => {
    room.disconnect()
  })

  return div(
    { class: 'p-8 space-y-6' },
    h2({ class: 'text-2xl font-bold' }, 'Debug Panel'),
    div(
      { class: 'space-y-4' },
      div(
        { class: 'space-y-2' },
        div({ class: 'font-semibold text-lg' }, 'Connection Status'),
        div({ class: 'badge badge-primary' }, () => debugState.connectionStatus)
      ),
      div(
        { class: 'space-y-2' },
        div({ class: 'font-semibold text-lg' }, 'Player ID'),
        div(
          { class: 'bg-base-300 p-4 rounded-lg font-mono text-sm break-all' },
          () => debugState.playerId || 'Waiting for ID...'
        )
      ),
      div(
        { class: 'space-y-2' },
        div({ class: 'font-semibold text-lg' }, 'Last Event'),
        pre(
          { class: 'bg-base-300 p-4 rounded-lg overflow-x-auto' },
          code(() => {
            const history = debugState.history
            return history.length > 0 ? history[history.length - 1] : 'No events yet...'
          })
        )
      ),
      div(
        { class: 'space-y-2' },
        div({ class: 'font-semibold text-lg' }, 'Event History'),
        div(
          { class: 'bg-base-300 p-4 rounded-lg font-mono text-sm' },
          pre(
            { class: 'whitespace-pre-wrap break-all max-h-[400px] overflow-y-auto' },
            () => debugState.history.join('\n\n') || 'No events yet...'
          )
        )
      )
    )
  )
}
