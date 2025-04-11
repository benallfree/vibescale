import van from 'vanjs-core'
import { reactive } from 'vanjs-ext'
import {
  createRoom,
  RoomEventType,
  type EmitterEvent,
  type Player,
  type Room,
  type RoomEventPayloads,
  type RoomEvents,
} from 'vibescale'
import { appState } from '../state'
import { JSONEditor } from './components/JSONEditor'

const { div, h2, pre, code, button, input } = van.tags

interface DebugState {
  history: Array<EmitterEvent<RoomEvents> & { timestamp: string }>
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  player: Player | null
  url: string
  room: Room<Record<string, unknown>, Record<string, unknown>> | null
}

export const DebugPanel = () => {
  // Create state
  const debugState = reactive<DebugState>({
    history: [],
    connectionStatus: 'disconnected',
    player: null,
    url: `//${window.location.host}/${appState.roomName}`,
    room: null,
  })

  // Helper to format event for display
  const formatEvent = (event: EmitterEvent<RoomEvents> & { timestamp: string }) => {
    let message = `[${event.timestamp}] ${event.name}`
    if (event.data !== undefined) {
      message += `\n${JSON.stringify(event.data, null, 2)}`
    }
    return message
  }

  // Store the pre element reference
  const preElement = pre(
    { class: 'whitespace-pre-wrap break-all max-h-[400px] overflow-y-auto' },
    () => debugState.history.map(formatEvent).join('\n\n') || 'No events yet...'
  )

  // Function to scroll to bottom
  const scrollToBottom = () => {
    preElement.scrollTop = preElement.scrollHeight
  }

  // Function to connect to room
  const connectToRoom = () => {
    if (debugState.room) {
      debugState.room.disconnect()
    }

    debugState.connectionStatus = 'connecting'
    const room = createRoom(appState.roomName, {
      endpoint: debugState.url,
    })

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
      debugState.history = [...debugState.history, { ...event, timestamp: new Date().toISOString() }]
      // Schedule scroll after the DOM updates
      setTimeout(scrollToBottom, 0)
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

    debugState.room = room
  }

  // Type guard functions
  function isPlayerEvent(
    event: EmitterEvent<RoomEventPayloads>
  ): event is EmitterEvent<RoomEventPayloads> & { data: Player } {
    return [RoomEventType.PlayerJoined, RoomEventType.PlayerLeft, RoomEventType.PlayerUpdated].includes(
      event.name as RoomEventType
    )
  }

  // Cleanup
  window.addEventListener('beforeunload', () => {
    if (debugState.room) {
      debugState.room.disconnect()
    }
  })

  return div(
    { class: 'p-8 space-y-6' },
    h2({ class: 'text-2xl font-bold' }, 'Debug Panel'),
    div(
      { class: 'space-y-4' },
      // URL input and connect button
      div(
        { class: 'flex gap-2 items-center' },
        input({
          type: 'text',
          class: 'input input-bordered flex-1',
          value: debugState.url,
          oninput: (e) => {
            debugState.url = (e.target as HTMLInputElement).value
          },
        }),
        button(
          {
            class: () => `btn ${debugState.connectionStatus === 'connected' ? 'btn-error' : 'btn-primary'}`,
            onclick: () => {
              if (debugState.connectionStatus === 'connected') {
                debugState.room?.disconnect()
              } else {
                connectToRoom()
              }
            },
          },
          () => (debugState.connectionStatus === 'connected' ? 'Disconnect' : 'Connect')
        )
      ),
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
        // State editor
        JSONEditor({
          value: JSON.stringify({}, null, 2),
          onUpdate: (state) => debugState.room?.setLocalPlayerDelta(state),
          placeholder: 'Enter state JSON (position and rotation)...',
          label: 'State',
        }),
        // Metadata editor
        JSONEditor({
          value: JSON.stringify({}, null, 2),
          onUpdate: (metadata) => debugState.room?.setLocalPlayerMetadata(metadata),
          placeholder: 'Enter JSON metadata...',
          label: 'Metadata',
        })
      ),
      div(
        { class: 'space-y-2' },
        div(
          { class: 'flex justify-between items-center' },
          div(
            { class: 'font-semibold text-lg flex items-center gap-2' },
            'WebSocket Wire History',
            div({ class: 'badge badge-secondary text-sm' }, () => debugState.history.length.toString())
          ),
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
        div({ class: 'bg-base-300 p-4 rounded-lg font-mono text-sm' }, preElement)
      )
    )
  )
}
