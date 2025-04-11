import van from 'vanjs-core'
import { reactive } from 'vanjs-ext'
import {
  createRoom,
  RoomEventType,
  type EmitterEvent,
  type Player,
  type RoomEventPayloads,
  type RoomEvents,
} from 'vibescale'
import { appState } from '../state'

const { div, h2, pre, code, textarea, button } = van.tags

interface DebugState {
  history: EmitterEvent<RoomEvents>[]
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  player: Player | null
  stateText: string
  metadataText: string
}

export const DebugPanel = () => {
  // Create state
  const debugState = reactive<DebugState>({
    history: [],
    connectionStatus: 'connecting',
    player: null,
    stateText: JSON.stringify(
      {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      },
      null,
      2
    ),
    metadataText: JSON.stringify({}, null, 2),
  })

  // Connect to room using client library
  const room = createRoom(appState.roomName, {
    // this will default to the vibescale server that the debug panel is hosted on
    endpoint: '',
  })

  // Type guard functions
  function isPlayerEvent(
    event: EmitterEvent<RoomEventPayloads>
  ): event is EmitterEvent<RoomEventPayloads> & { data: Player } {
    return [RoomEventType.PlayerJoined, RoomEventType.PlayerLeft, RoomEventType.PlayerUpdated].includes(
      event.name as RoomEventType
    )
  }

  // Connection events
  room.on(RoomEventType.Connected, () => {
    debugState.connectionStatus = 'connected'
  })

  room.on(RoomEventType.Disconnected, () => {
    debugState.connectionStatus = 'disconnected'
    debugState.player = null
  })

  // Debug events - capture all events
  room.on('*', (event) => {
    debugState.history = [...debugState.history, event]
  })

  // Player events
  room.on(RoomEventType.PlayerJoined, (event: EmitterEvent<RoomEventPayloads>) => {
    if (isPlayerEvent(event)) {
      debugState.player = event.data
    }
  })

  room.on(RoomEventType.PlayerLeft, (event: EmitterEvent<RoomEventPayloads>) => {
    if (isPlayerEvent(event) && debugState.player?.id === event.data.id) {
      debugState.player = null
    }
  })

  room.on(RoomEventType.PlayerUpdated, (event: EmitterEvent<RoomEventPayloads>) => {
    if (isPlayerEvent(event) && debugState.player?.id === event.data.id) {
      debugState.player = event.data
    }
  })

  // Error events
  room.on(RoomEventType.Error, (event: EmitterEvent<RoomEventPayloads>) => {
    if (event.name === RoomEventType.Error) {
      debugState.connectionStatus = 'disconnected'
    }
  })

  // Cleanup
  window.addEventListener('beforeunload', () => {
    room.disconnect()
  })

  // Helper to format event for display
  const formatEvent = (event: EmitterEvent<RoomEvents>) => {
    const timestamp = new Date().toISOString()
    let message = `[${timestamp}] ${event.name}`
    if (event.data !== undefined) {
      message += `\n${JSON.stringify(event.data, null, 2)}`
    }
    return message
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
          () => debugState.player?.id || 'Waiting for ID...'
        )
      ),
      div(
        { class: 'grid grid-cols-2 gap-4' },
        // State panel
        div(
          { class: 'space-y-2' },
          div({ class: 'font-semibold text-lg' }, 'State'),
          div(
            { class: 'bg-base-300 p-4 rounded-lg space-y-2' },
            textarea({
              value: () => debugState.stateText,
              oninput: (e) => {
                debugState.stateText = (e.target as HTMLTextAreaElement).value
              },
              class: 'w-full h-64 font-mono text-sm p-2 rounded',
              placeholder: 'Enter state JSON (position and rotation)...',
            }),
            button(
              {
                onclick: () => {
                  try {
                    const state = JSON.parse(debugState.stateText)
                    room.setLocalPlayerDelta(state)
                  } catch (e) {
                    console.error('Failed to update state:', e)
                  }
                },
                class: 'btn btn-primary btn-sm w-full',
              },
              'Update State'
            )
          )
        ),
        // Metadata panel
        div(
          { class: 'space-y-2' },
          div({ class: 'font-semibold text-lg' }, 'Metadata'),
          div(
            { class: 'bg-base-300 p-4 rounded-lg space-y-2' },
            textarea({
              value: () => debugState.metadataText,
              oninput: (e) => {
                debugState.metadataText = (e.target as HTMLTextAreaElement).value
              },
              class: 'w-full h-64 font-mono text-sm p-2 rounded',
              placeholder: 'Enter JSON metadata...',
            }),
            button(
              {
                onclick: () => {
                  try {
                    const metadata = JSON.parse(debugState.metadataText)
                    room.setLocalPlayerMetadata(metadata)
                  } catch (e) {
                    console.error('Failed to update metadata:', e)
                  }
                },
                class: 'btn btn-primary btn-sm w-full',
              },
              'Update Metadata'
            )
          )
        )
      ),
      div(
        { class: 'space-y-2' },
        div(
          { class: 'flex justify-between items-center' },
          div({ class: 'font-semibold text-lg' }, 'WebSocket Wire History'),
          button(
            {
              onclick: () => {
                debugState.history = []
              },
              class: 'btn btn-sm btn-ghost',
            },
            'Clear'
          )
        ),
        div(
          { class: 'bg-base-300 p-4 rounded-lg font-mono text-sm' },
          pre(
            { class: 'whitespace-pre-wrap break-all max-h-[400px] overflow-y-auto' },
            () => debugState.history.map(formatEvent).join('\n\n') || 'No events yet...'
          )
        )
      )
    )
  )
}
