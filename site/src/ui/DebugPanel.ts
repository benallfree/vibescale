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

const { div, h2, pre, code, button, input, canvas } = van.tags

interface DebugState {
  history: Array<EmitterEvent<RoomEvents> & { timestamp: string }>
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  localPlayer: Player<Record<string, unknown>, Record<string, unknown>> | null
  url: string
  room: Room<Record<string, unknown>, Record<string, unknown>> | null
  players: Record<string, Player<Record<string, unknown>, Record<string, unknown>>>
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
    players: {},
    selectedPlayerId: null,
    editorValue: '{}',
    activeTab: 'radar',
  })

  // Helper to format event for display
  const formatEvent = (event: EmitterEvent<RoomEvents> & { timestamp: string }) => {
    let message = `[${event.timestamp}] ${event.name}`
    if (event.data !== undefined) {
      message += `\n${JSON.stringify(event.data, null, 2)}`
    }
    return message
  }

  // Function to scroll to bottom
  const scrollToBottom = (element: HTMLPreElement) => {
    element.scrollTop = element.scrollHeight
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
      debugState.players = {}
      debugState.selectedPlayerId = null
    })

    // Debug events - capture all events
    room.on('*', (event) => {
      debugState.history = [...debugState.history, { ...event, timestamp: new Date().toISOString() }]
      // Schedule scroll after the DOM updates
      if (debugState.activeTab === 'logs') {
        const logElement = document.querySelector('.debug-logs-pre') as HTMLPreElement
        if (logElement) {
          setTimeout(() => scrollToBottom(logElement), 0)
        }
      }
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
        debugState.players[player.id] = player
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
        delete debugState.players[player.id]
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
        debugState.players[player.id] = player

        // If this is the currently selected player, update their data in the editor
        if (debugState.selectedPlayerId === player.id) {
          const selectedPlayer = debugState.players[player.id]
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

  // Add RadarView component
  const RadarView = () => {
    const canvasRef = canvas({
      width: 400,
      height: 400,
      class: 'bg-base-100 rounded-lg',
    })

    const drawTriangle = (ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, color: string) => {
      const size = 10 // Triangle size stays constant
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rotation)
      ctx.beginPath()
      ctx.moveTo(0, -size)
      ctx.lineTo(-size / 2, size)
      ctx.lineTo(size / 2, size)
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
      ctx.restore()
    }

    const drawGrid = (ctx: CanvasRenderingContext2D, scale: number) => {
      const gridSize = 40 // Base grid size
      const scaledGridSize = gridSize * scale
      const numLines = Math.floor(400 / scaledGridSize)

      ctx.strokeStyle = '#4A5568'
      ctx.lineWidth = 0.5

      // Draw from center outwards
      const center = 200
      for (let i = 0; i <= numLines / 2; i++) {
        // Positive direction
        ctx.beginPath()
        ctx.moveTo(center + i * scaledGridSize, 0)
        ctx.lineTo(center + i * scaledGridSize, 400)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(0, center + i * scaledGridSize)
        ctx.lineTo(400, center + i * scaledGridSize)
        ctx.stroke()

        // Negative direction
        if (i > 0) {
          ctx.beginPath()
          ctx.moveTo(center - i * scaledGridSize, 0)
          ctx.lineTo(center - i * scaledGridSize, 400)
          ctx.stroke()

          ctx.beginPath()
          ctx.moveTo(0, center - i * scaledGridSize)
          ctx.lineTo(400, center - i * scaledGridSize)
          ctx.stroke()
        }
      }
    }

    const calculateBounds = (players: Record<string, Player<Record<string, unknown>, Record<string, unknown>>>) => {
      let minX = 0,
        maxX = 0,
        minZ = 0,
        maxZ = 0
      let hasPlayers = false

      Object.values(players).forEach((player) => {
        const rawPlayer = raw(player)
        const delta = rawPlayer.delta as { position?: { x: number; y: number; z: number } }

        if (delta?.position) {
          hasPlayers = true
          minX = Math.min(minX, delta.position.x)
          maxX = Math.max(maxX, delta.position.x)
          minZ = Math.min(minZ, delta.position.z)
          maxZ = Math.max(maxZ, delta.position.z)
        }
      })

      if (!hasPlayers) {
        return { minX: -5, maxX: 5, minZ: -5, maxZ: 5, scale: 1 }
      }

      // Add padding to bounds
      const padding = 2
      minX -= padding
      maxX += padding
      minZ -= padding
      maxZ += padding

      // Calculate scale to fit all players
      const xRange = Math.abs(maxX - minX)
      const zRange = Math.abs(maxZ - minZ)
      const maxRange = Math.max(xRange, zRange)

      // Calculate scale to fit in canvas (380 to leave room for labels)
      const scale = maxRange === 0 ? 1 : 380 / (maxRange * 40)

      return { minX, maxX, minZ, maxZ, scale }
    }

    const drawPlayers = (
      ctx: CanvasRenderingContext2D,
      players: Record<string, Player<Record<string, unknown>, Record<string, unknown>>>,
      bounds: ReturnType<typeof calculateBounds>
    ) => {
      const { scale } = bounds

      Object.values(players).forEach((player) => {
        // Scale and center the coordinates
        const x = player.delta.position.x * 40 * scale + 200
        const z = player.delta.position.z * 40 * scale + 200
        const rotation = player.delta.rotation?.y || 0

        // Draw player triangle
        drawTriangle(ctx, x, z, rotation, player.isLocal ? '#60A5FA' : '#F87171')

        // Draw player ID label
        ctx.save()
        ctx.fillStyle = '#E5E7EB'
        ctx.font = '10px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(player.id.slice(-4), x, z + 20)
        ctx.restore()
      })
    }

    const updateRadar = () => {
      console.log('updateRadar')
      const ctx = canvasRef.getContext('2d')
      if (!ctx) return

      // Calculate bounds and scale
      const bounds = calculateBounds(debugState.players)

      // Clear canvas
      ctx.clearRect(0, 0, 400, 400)

      // Draw grid with calculated scale
      drawGrid(ctx, bounds.scale)

      // Draw center crosshair
      ctx.strokeStyle = '#9CA3AF'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(198, 200)
      ctx.lineTo(202, 200)
      ctx.moveTo(200, 198)
      ctx.lineTo(200, 202)
      ctx.stroke()

      // Draw scale indicator
      ctx.save()
      ctx.fillStyle = '#9CA3AF'
      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`Scale: ${bounds.scale.toFixed(2)}x`, 10, 20)
      ctx.restore()

      // Draw players with calculated scale
      drawPlayers(ctx, debugState.players, bounds)
    }

    // Update radar on state changes
    van.derive(updateRadar)

    return canvasRef
  }

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
            div({ class: 'badge badge-secondary text-sm' }, () => Object.keys(debugState.players).length.toString())
          )
        ),
        // Grid with player list and editor
        div(
          { class: 'grid grid-cols-3 gap-4' },
          // Player list with fixed height
          div({ class: 'bg-base-300 p-4 rounded-lg col-span-1 h-[400px] flex flex-col overflow-hidden' }, () => {
            const playerIds = Object.keys(debugState.players)
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
              { class: 'space-y-2 overflow-y-auto flex-1' },
              ...sortedPlayerIds.map((id) =>
                div(
                  {
                    class: () =>
                      `p-2 rounded cursor-pointer hover:bg-base-200 ${
                        debugState.selectedPlayerId === id ? 'bg-base-200' : ''
                      }`,
                    onclick: () => {
                      debugState.selectedPlayerId = id
                      const selectedPlayer = debugState.players[id]
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
          // Selected player view with fixed height
          div(
            {
              class: 'bg-base-300 p-4 rounded-lg font-mono text-sm col-span-2 h-[400px] flex flex-col overflow-hidden',
            },
            () => {
              const selectedPlayer = debugState.selectedPlayerId
                ? debugState.players[debugState.selectedPlayerId]
                : null

              if (!selectedPlayer) {
                return div({ class: 'text-sm text-base-content/50 italic' }, 'Select a player to view details...')
              }

              const rawPlayer = raw(selectedPlayer)
              const isLocalPlayer = selectedPlayer.isLocal
              const playerData = {
                id: rawPlayer.id,
                delta: rawPlayer.delta,
                metadata: rawPlayer.metadata,
                server: rawPlayer.server,
                isLocal: rawPlayer.isLocal,
              }

              return div(
                { class: 'flex-1' },
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
                          // Update local player in players map
                          if (player.id) {
                            const currentPlayer = debugState.players[player.id]
                            if (currentPlayer) {
                              debugState.players[player.id] = {
                                ...currentPlayer,
                                delta: delta as PlayerDelta<Record<string, unknown>>,
                              }
                            }
                          }
                        }
                        if (metadata) {
                          debugState.room?.setLocalPlayerMetadata(metadata)
                          // Update local player metadata in players map
                          if (player.id) {
                            const currentPlayer = debugState.players[player.id]
                            if (currentPlayer) {
                              debugState.players[player.id] = {
                                ...currentPlayer,
                                metadata,
                              }
                            }
                          }
                        }
                      } catch (err) {
                        console.error('Failed to parse or update player data:', err)
                      }
                    }
                  },
                  placeholder: isLocalPlayer ? 'Enter player data...' : 'Remote player data (read-only)',
                  label: '',
                  readonly: () => !isLocalPlayer,
                  containerClass: 'h-full flex flex-col',
                })
              )
            }
          )
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
            return div(
              { class: 'flex flex-col items-center gap-4' },
              RadarView(),
              div({ class: 'text-sm text-base-content/70' }, 'Grid scale: 1 unit = 40px')
            )
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
              div(
                { class: 'font-mono text-sm' },
                pre(
                  { class: 'whitespace-pre-wrap break-all max-h-[400px] overflow-y-auto debug-logs-pre' },
                  () => debugState.history.map(formatEvent).join('\n\n') || 'No events yet...'
                )
              )
            )
          }
        })
      )
    )
  )
}
