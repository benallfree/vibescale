import van from 'vanjs-core'
import { reactive } from 'vanjs-ext'
import { createRoom, DebugEvent, type PlayerComplete } from 'vibescale'
import { appState } from '../state'

const { div, h2, pre, code, textarea, button } = van.tags

interface DebugState {
  history: string[]
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  playerId: string | null
  metadataText: string
  stateText: string
  hasMetadataError: boolean
  hasStateError: boolean
}

export const DebugPanel = () => {
  // Create state
  const debugState = reactive<DebugState>({
    history: [],
    connectionStatus: 'connecting',
    playerId: null,
    metadataText: '{}',
    stateText: JSON.stringify(
      {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      },
      null,
      2
    ),
    hasMetadataError: false,
    hasStateError: false,
  })

  // Connect to room using client library
  const room = createRoom(appState.roomName, {
    // this will default to the vibescale server that the debug panel is hosted on
    endpoint: '',
  })

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
      message += ` ${JSON.stringify(data)}`
    }

    debugState.history = [...debugState.history, message]
  })

  // Player events
  room.on('playerJoin', (player: PlayerComplete<{}, {}>) => {
    if (!debugState.playerId) {
      debugState.playerId = player.id
      // Format the metadata nicely with 2 spaces indentation
      debugState.metadataText = JSON.stringify(player.metadata, null, 2)
      // Format the state nicely with 2 spaces indentation
      const { position, rotation } = player
      debugState.stateText = JSON.stringify({ position, rotation }, null, 2)
    }
    const timestamp = new Date().toISOString()
    debugState.history = [...debugState.history, `[${timestamp}] Player joined: ${player.id}`]
  })

  room.on('playerLeave', (player: PlayerComplete<{}, {}>) => {
    const timestamp = new Date().toISOString()
    debugState.history = [...debugState.history, `[${timestamp}] Player left: ${player.id}`]
  })

  room.on('playerUpdate', (player: PlayerComplete<{}, {}>) => {
    if (player.id === debugState.playerId) {
      // Update the metadata text when our player is updated
      debugState.metadataText = JSON.stringify(player.metadata, null, 2)
      // Update the state text when our player is updated
      const { position, rotation } = player
      debugState.stateText = JSON.stringify({ position, rotation }, null, 2)
    }
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

  // Function to update metadata
  const updateMetadata = () => {
    try {
      const metadata = JSON.parse(debugState.metadataText)
      room.setMetadata(metadata)
      debugState.hasMetadataError = false
    } catch (e) {
      debugState.hasMetadataError = true
      console.error('Invalid JSON:', e)
    }
  }

  // Function to update state
  const updateState = () => {
    try {
      const state = JSON.parse(debugState.stateText)
      // Validate that state has position and rotation as Vector3
      if (
        !state.position ||
        !state.rotation ||
        !['x', 'y', 'z'].every((key) => typeof state.position[key] === 'number') ||
        !['x', 'y', 'z'].every((key) => typeof state.rotation[key] === 'number')
      ) {
        throw new Error('State must have position and rotation as Vector3')
      }
      // Send state update
      room.setState(state)
      debugState.hasStateError = false
    } catch (e) {
      debugState.hasStateError = true
      console.error('Invalid state:', e)
    }
  }

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
        div({ class: 'font-semibold text-lg' }, 'State'),
        div(
          { class: 'bg-base-300 p-4 rounded-lg space-y-2' },
          textarea({
            value: () => debugState.stateText,
            oninput: (e: Event) => {
              debugState.stateText = (e.target as HTMLTextAreaElement).value
              try {
                const state = JSON.parse(debugState.stateText)
                if (
                  !state.position ||
                  !state.rotation ||
                  !['x', 'y', 'z'].every((key) => typeof state.position[key] === 'number') ||
                  !['x', 'y', 'z'].every((key) => typeof state.rotation[key] === 'number')
                ) {
                  throw new Error('Invalid state format')
                }
                debugState.hasStateError = false
              } catch (e) {
                debugState.hasStateError = true
              }
            },
            class: () =>
              `w-full h-32 font-mono text-sm p-2 rounded ${debugState.hasStateError ? 'border-2 border-red-500' : ''}`,
            placeholder: 'Enter state JSON (position and rotation)...',
          }),
          button(
            {
              onclick: updateState,
              class: () => `btn ${debugState.hasStateError ? 'btn-error' : 'btn-primary'} btn-sm w-full`,
              disabled: () => debugState.hasStateError,
            },
            () => (debugState.hasStateError ? 'Invalid State Format' : 'Update State')
          )
        )
      ),
      div(
        { class: 'space-y-2' },
        div({ class: 'font-semibold text-lg' }, 'Metadata'),
        div(
          { class: 'bg-base-300 p-4 rounded-lg space-y-2' },
          textarea({
            value: () => debugState.metadataText,
            oninput: (e: Event) => {
              debugState.metadataText = (e.target as HTMLTextAreaElement).value
              try {
                JSON.parse(debugState.metadataText)
                debugState.hasMetadataError = false
              } catch (e) {
                debugState.hasMetadataError = true
              }
            },
            class: () =>
              `w-full h-32 font-mono text-sm p-2 rounded ${
                debugState.hasMetadataError ? 'border-2 border-red-500' : ''
              }`,
            placeholder: 'Enter JSON metadata...',
          }),
          button(
            {
              onclick: updateMetadata,
              class: () => `btn ${debugState.hasMetadataError ? 'btn-error' : 'btn-primary'} btn-sm w-full`,
              disabled: () => debugState.hasMetadataError,
            },
            () => (debugState.hasMetadataError ? 'Invalid JSON' : 'Update Metadata')
          )
        )
      ),
      div(
        { class: 'space-y-2' },
        div({ class: 'font-semibold text-lg' }, 'WebSocket Wire History'),
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
