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
  localPlayer: Player<Record<string, unknown>, Record<string, unknown>> | null
  url: string
  room: Room<Record<string, unknown>, Record<string, unknown>> | null
  remotePlayers: Record<string, Player<Record<string, unknown>, Record<string, unknown>>>
  selectedPlayerId: string | null
}

export const DebugPanel = () => {
  // Create state
  const debugState = reactive<DebugState>({
    history: [],
    connectionStatus: 'disconnected',
    localPlayer: null,
    url: `//${window.location.host}/${appState.roomName}`,
    room: null,
    remotePlayers: {},
    selectedPlayerId: null,
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
      debugState.localPlayer = null
      debugState.remotePlayers = {}
      debugState.selectedPlayerId = null
    })

    // Debug events - capture all events
    room.on('*', (event) => {
      debugState.history = [...debugState.history, { ...event, timestamp: new Date().toISOString() }]
      // Schedule scroll after the DOM updates
      setTimeout(scrollToBottom, 0)
    })

    // Player events
    room.on(
      RoomEventType.PlayerJoined,
      (
        event: EmitterEvent<
          RoomEventPayloads<Record<string, unknown>, Record<string, unknown>>,
          RoomEventType.PlayerJoined
        >
      ) => {
        console.log('PlayerJoined', event)
        const player = event.data
        if (player.isLocal) {
          debugState.localPlayer = player
        }
        debugState.remotePlayers[player.id] = player
      }
    )

    room.on(
      RoomEventType.PlayerLeft,
      (
        event: EmitterEvent<
          RoomEventPayloads<Record<string, unknown>, Record<string, unknown>>,
          RoomEventType.PlayerLeft
        >
      ) => {
        const player = event.data
        if (debugState.localPlayer?.id === player.id) {
          debugState.localPlayer = null
        }
        if (debugState.selectedPlayerId === player.id) {
          debugState.selectedPlayerId = null
        }
        delete debugState.remotePlayers[player.id]
      }
    )

    room.on(
      RoomEventType.PlayerUpdated,
      (
        event: EmitterEvent<
          RoomEventPayloads<Record<string, unknown>, Record<string, unknown>>,
          RoomEventType.PlayerUpdated
        >
      ) => {
        const player = event.data
        if (player.isLocal) {
          debugState.localPlayer = player
        }
        debugState.remotePlayers[player.id] = player
      }
    )

    // Error events
    room.on(RoomEventType.Error, (event: EmitterEvent<RoomEventPayloads>) => {
      if (event.name === RoomEventType.Error) {
        debugState.connectionStatus = 'disconnected'
      }
    })

    debugState.room = room
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
        { class: 'flex items-center gap-4' },
        div(
          { class: 'flex items-center gap-2' },
          input({
            type: 'text',
            class: 'input input-bordered input-sm w-64',
            value: debugState.url,
            oninput: (e) => {
              debugState.url = (e.target as HTMLInputElement).value
            },
          }),
          button(
            {
              class: () => `btn btn-sm ${debugState.connectionStatus === 'connected' ? 'btn-error' : 'btn-primary'}`,
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
          { class: 'flex items-center gap-2' },
          div({ class: 'font-semibold text-sm' }, 'Status:'),
          div({ class: 'badge badge-sm badge-primary' }, () => debugState.connectionStatus)
        ),
        div(
          { class: 'flex items-center gap-2' },
          div({ class: 'font-semibold text-sm' }, 'Player ID:'),
          code(
            { class: 'bg-base-300 px-2 py-1 rounded text-xs' },
            () => debugState.localPlayer?.id || 'Waiting for ID...'
          )
        )
      ),
      div(
        { class: 'grid grid-cols-2 gap-4 mt-4' },
        // Players Online section
        div(
          { class: 'space-y-2' },
          div(
            { class: 'flex justify-between items-center' },
            div(
              { class: 'font-semibold text-lg flex items-center gap-2' },
              'Players Online',
              div({ class: 'badge badge-secondary text-sm' }, () =>
                Object.keys(debugState.remotePlayers).length.toString()
              )
            )
          ),
          div(
            { class: 'grid grid-cols-2 gap-4' },
            // Player list
            div({ class: 'bg-base-300 p-4 rounded-lg' }, () => {
              const playerIds = Object.keys(debugState.remotePlayers)
              if (playerIds.length === 0) {
                return div({ class: 'text-sm text-base-content/50 italic' }, 'No players online...')
              }

              // Sort playerIds to show local player first
              const sortedPlayerIds = playerIds.sort((a, b) => {
                const localPlayerId = debugState.room?.getLocalPlayer()?.id
                if (a === localPlayerId) return -1
                if (b === localPlayerId) return 1
                return 0
              })

              return div(
                { class: 'space-y-2' },
                ...sortedPlayerIds.map((id) =>
                  div(
                    {
                      class: () =>
                        `p-2 rounded cursor-pointer hover:bg-base-200 ${
                          debugState.selectedPlayerId === id ? 'bg-base-200' : ''
                        }`,
                      onclick: () => {
                        debugState.selectedPlayerId = id
                      },
                    },
                    code({ class: 'text-xs' }, id === debugState.room?.getLocalPlayer()?.id ? `Local (${id})` : id)
                  )
                )
              )
            }),
            // Selected player view
            div({ class: 'bg-base-300 p-4 rounded-lg font-mono text-sm' }, () => {
              const selectedPlayer = debugState.selectedPlayerId
                ? debugState.remotePlayers[debugState.selectedPlayerId]
                : null
              return selectedPlayer
                ? pre(
                    { class: 'whitespace-pre-wrap break-all' },
                    code({ class: 'language-json' }, JSON.stringify(selectedPlayer, null, 2))
                  )
                : div({ class: 'text-sm text-base-content/50 italic' }, 'Select a player to view details...')
            })
          )
        ),
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
