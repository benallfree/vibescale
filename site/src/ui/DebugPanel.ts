import van from 'vanjs-core'
import { raw, reactive } from 'vanjs-ext'
import {
  createRoom,
  RoomEventType,
  type EmitterEvent,
  type Player,
  type PlayerDelta,
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
  editorValue: string
  activeTab: 'radar' | 'logs'
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
    editorValue: '{}',
    activeTab: 'logs',
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
          const rawPlayer = raw(player)
          const playerData = {
            id: rawPlayer.id,
            delta: rawPlayer.delta,
            metadata: rawPlayer.metadata,
            server: rawPlayer.server,
            isLocal: rawPlayer.isLocal,
          }
          debugState.editorValue = JSON.stringify(playerData, null, 2)
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
          const rawPlayer = raw(player)
          const playerData = {
            id: rawPlayer.id,
            delta: rawPlayer.delta,
            metadata: rawPlayer.metadata,
            server: rawPlayer.server,
            isLocal: rawPlayer.isLocal,
          }
          debugState.editorValue = JSON.stringify(playerData, null, 2)
        }
        debugState.remotePlayers[player.id] = player

        // If this is the currently selected player, update their data in the editor
        if (debugState.selectedPlayerId === player.id) {
          const selectedPlayer = debugState.remotePlayers[player.id]
          const rawPlayer = raw(selectedPlayer)
          const updatedData = {
            id: rawPlayer.id,
            delta: rawPlayer.delta,
            metadata: rawPlayer.metadata,
            server: rawPlayer.server,
            isLocal: rawPlayer.isLocal,
          }
          if (!selectedPlayer.isLocal) {
            // Only update non-local player data directly
            debugState.editorValue = JSON.stringify(updatedData, null, 2)
          }
        }
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
          code({ class: 'bg-base-300 px-2 py-1 rounded text-xs' }, () =>
            debugState.localPlayer?.id ? debugState.localPlayer.id.slice(-4) : 'Waiting for ID...'
          )
        )
      ),
      // Players section in grid
      div(
        { class: 'space-y-4' },
        // Players Online header
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
        // Grid with player list and editor
        div(
          { class: 'grid grid-cols-3 gap-4' },
          // Player list
          div({ class: 'bg-base-300 p-4 rounded-lg col-span-1' }, () => {
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
                      const selectedPlayer = debugState.remotePlayers[id]
                      const rawPlayer = raw(selectedPlayer)
                      const playerData = {
                        id: rawPlayer.id,
                        delta: rawPlayer.delta,
                        metadata: rawPlayer.metadata,
                        server: rawPlayer.server,
                        isLocal: rawPlayer.isLocal,
                      }
                      if (selectedPlayer.isLocal) {
                        debugState.editorValue = JSON.stringify(playerData, null, 2)
                      }
                    },
                  },
                  code(
                    { class: 'text-xs' },
                    id === debugState.room?.getLocalPlayer()?.id ? `Local (${id.slice(-4)})` : id.slice(-4)
                  )
                )
              )
            )
          }),
          // Selected player view
          div({ class: 'bg-base-300 p-4 rounded-lg font-mono text-sm col-span-2' }, () => {
            const selectedPlayer = debugState.selectedPlayerId
              ? debugState.remotePlayers[debugState.selectedPlayerId]
              : null

            if (!selectedPlayer) {
              return div({ class: 'text-sm text-base-content/50 italic' }, 'Select a player to view details...')
            }

            console.log('Selected player:', selectedPlayer)
            // Access the raw values from the reactive object
            const rawPlayer = raw(selectedPlayer)
            console.log('Raw player:', rawPlayer)

            const isLocalPlayer = selectedPlayer.isLocal
            const playerData = {
              id: rawPlayer.id,
              delta: rawPlayer.delta,
              metadata: rawPlayer.metadata,
              server: rawPlayer.server,
              isLocal: rawPlayer.isLocal,
            }

            console.log('Complete player data:', playerData)

            return div(
              { class: 'space-y-4' },
              JSONEditor({
                value: () => {
                  const rawPlayer = raw(selectedPlayer)
                  const playerData = {
                    id: rawPlayer.id,
                    delta: rawPlayer.delta,
                    metadata: rawPlayer.metadata,
                    server: rawPlayer.server,
                    isLocal: rawPlayer.isLocal,
                  }
                  return JSON.stringify(playerData, null, 2)
                },
                onUpdate: (value) => {
                  if (isLocalPlayer) {
                    try {
                      const currentData = value
                      const player = debugState.localPlayer
                      if (!player) return

                      // Extract delta and metadata from the complete object
                      const { delta, metadata } = currentData

                      // Send updates if there are changes
                      if (delta) {
                        debugState.room?.setLocalPlayerDelta(delta as PlayerDelta<Record<string, unknown>>)
                      }
                      if (metadata) {
                        debugState.room?.setLocalPlayerMetadata(metadata)
                      }
                    } catch (err) {
                      console.error('Failed to parse or update player data:', err)
                    }
                  }
                },
                placeholder: isLocalPlayer ? 'Enter player data...' : 'Remote player data (read-only)',
                label: '',
                readonly: () => !isLocalPlayer,
              })
            )
          })
        )
      ),
      // Tabs section
      div(
        { class: 'space-y-2 mt-4' },
        // Tab buttons
        div(
          { class: 'flex gap-2' },
          button(
            {
              class: () => `btn btn-sm ${debugState.activeTab === 'radar' ? 'btn-primary' : 'btn-ghost'}`,
              onclick: () => {
                debugState.activeTab = 'radar'
              },
            },
            'Radar'
          ),
          button(
            {
              class: () => `btn btn-sm ${debugState.activeTab === 'logs' ? 'btn-primary' : 'btn-ghost'}`,
              onclick: () => {
                debugState.activeTab = 'logs'
              },
            },
            div(
              { class: 'flex items-center gap-2' },
              'Logs',
              div({ class: 'badge badge-sm' }, () => debugState.history.length.toString())
            )
          )
        ),
        // Tab content
        div({ class: 'bg-base-300 p-4 rounded-lg' }, () => {
          if (debugState.activeTab === 'radar') {
            return div({ class: 'text-sm text-base-content/50 italic' }, 'Radar view coming soon...')
          } else {
            return div(
              { class: 'space-y-2' },
              div(
                { class: 'flex justify-between items-center' },
                div({ class: 'font-semibold text-lg flex items-center gap-2' }),
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
              div({ class: 'font-mono text-sm' }, preElement)
            )
          }
        })
      )
    )
  )
}
