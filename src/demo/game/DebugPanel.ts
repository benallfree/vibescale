import * as THREE from 'three'
import { AudioManager } from './AudioManager'
import { Car } from './Car'
import { Sparkline } from './Sparkline'
import { WebSocketClient } from './WebSocketClient'

export class DebugPanel {
  private container!: HTMLDivElement
  private gearIcon!: HTMLDivElement
  private panel!: HTMLDivElement
  private fpsDisplay!: HTMLDivElement
  private usernameDisplay!: HTMLDivElement
  private playerIdDisplay!: HTMLDivElement
  private fxButtons!: HTMLDivElement
  private errorDisplay!: HTMLDivElement
  private networkDisplay!: HTMLDivElement
  private lastFrameTime = performance.now()
  private frameCount = 0
  private fps = 0
  private updateInterval = 500 // Update FPS every 500ms
  private lastFpsUpdate = performance.now()
  private consoleErrors: string[] = []

  // Network metrics tracking
  private lastMetricsUpdate = performance.now()
  private totalBytesIn = 0
  private totalBytesOut = 0
  private totalMsgsIn = 0
  private totalMsgsOut = 0
  private currentSecondBytesIn = 0
  private currentSecondBytesOut = 0
  private currentSecondMsgsIn = 0
  private currentSecondMsgsOut = 0

  private readonly WINDOW_SIZE = 60 // 60 seconds of history
  private windowIndex = 0
  private bytesInWindow: number[] = []
  private bytesOutWindow: number[] = []
  private msgsInWindow: number[] = []
  private msgsOutWindow: number[] = []

  // Network visualization
  private bytesInSparkline: Sparkline
  private bytesOutSparkline: Sparkline
  private msgsInSparkline: Sparkline
  private msgsOutSparkline: Sparkline

  constructor(
    private car: Car,
    private audioManager: AudioManager,
    private wsClient: WebSocketClient
  ) {
    // Initialize sparklines
    this.bytesInSparkline = new Sparkline(60, 20, '#4ade80') // Green
    this.bytesOutSparkline = new Sparkline(60, 20, '#60a5fa') // Blue
    this.msgsInSparkline = new Sparkline(60, 20, '#4ade80') // Green
    this.msgsOutSparkline = new Sparkline(60, 20, '#60a5fa') // Blue

    this.setupContainer()
    this.setupPanel()
    this.setupGearIcon()
    this.setupErrorHandling()
    this.setupWebSocketListeners()
    this.update()
  }

  private setupContainer() {
    this.container = document.createElement('div')
    this.container.style.position = 'fixed'
    this.container.style.top = '20px'
    this.container.style.left = '20px'
    this.container.style.zIndex = '1000'
    document.body.appendChild(this.container)
  }

  private setupGearIcon() {
    this.gearIcon = document.createElement('div')
    this.gearIcon.innerHTML = '⚙️'
    this.gearIcon.style.fontSize = '32px'
    this.gearIcon.style.cursor = 'pointer'
    this.gearIcon.style.transition = 'transform 0.3s'
    this.container.appendChild(this.gearIcon)

    // Restore panel state from localStorage
    const isPanelVisible = localStorage.getItem('debugPanelVisible') === 'true'
    this.panel.style.display = isPanelVisible ? 'block' : 'none'
    this.gearIcon.style.transform = isPanelVisible ? 'rotate(180deg)' : 'rotate(0deg)'

    this.gearIcon.addEventListener('click', () => {
      const newVisibility = this.panel.style.display === 'none' ? 'block' : 'none'
      this.panel.style.display = newVisibility
      this.gearIcon.style.transform = newVisibility === 'none' ? 'rotate(0deg)' : 'rotate(180deg)'
      // Save panel state to localStorage
      localStorage.setItem('debugPanelVisible', newVisibility === 'block' ? 'true' : 'false')
    })
  }

  private setupWebSocketListeners() {
    this.wsClient.on('message:received', (data: string) => {
      this.totalBytesIn += data.length
      this.totalMsgsIn++
      this.currentSecondBytesIn += data.length
      this.currentSecondMsgsIn++
    })

    this.wsClient.on('message:sent', (data: string) => {
      this.totalBytesOut += data.length
      this.totalMsgsOut++
      this.currentSecondBytesOut += data.length
      this.currentSecondMsgsOut++
    })
  }

  private setupPanel() {
    this.panel = document.createElement('div')
    this.panel.style.display = 'none'
    this.panel.style.position = 'absolute'
    this.panel.style.top = '50px'
    this.panel.style.left = '0'
    this.panel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
    this.panel.style.color = 'white'
    this.panel.style.padding = '15px'
    this.panel.style.borderRadius = '5px'
    this.panel.style.minWidth = '300px'
    this.container.appendChild(this.panel)

    // FPS Display
    this.fpsDisplay = document.createElement('div')
    this.fpsDisplay.style.marginBottom = '10px'
    this.panel.appendChild(this.fpsDisplay)

    // Network Stats Display
    this.networkDisplay = document.createElement('div')
    this.networkDisplay.style.marginBottom = '10px'

    // Create network stats container
    const statsContainer = document.createElement('div')
    statsContainer.style.fontSize = '12px'
    statsContainer.style.fontFamily = 'monospace'

    // Server URL
    const urlDiv = document.createElement('div')
    urlDiv.style.marginBottom = '5px'
    urlDiv.textContent = `Server: ${this.wsClient.getServerUrl()}`
    statsContainer.appendChild(urlDiv)

    // Total messages
    const totalMsgsDiv = document.createElement('div')
    totalMsgsDiv.style.marginBottom = '5px'
    totalMsgsDiv.innerHTML =
      'Total msgs in: <span id="total-msgs-in">0</span><br>Total msgs out: <span id="total-msgs-out">0</span>'
    statsContainer.appendChild(totalMsgsDiv)

    // Bytes stats
    const bytesDiv = document.createElement('div')
    bytesDiv.style.marginBottom = '5px'
    bytesDiv.innerHTML = 'KB/s in: <span id="bytes-in">0</span>'
    bytesDiv.appendChild(this.bytesInSparkline.getElement())
    bytesDiv.innerHTML += '<br>KB/s out: <span id="bytes-out">0</span>'
    bytesDiv.appendChild(this.bytesOutSparkline.getElement())
    statsContainer.appendChild(bytesDiv)

    // Messages stats
    const msgsDiv = document.createElement('div')
    msgsDiv.innerHTML = 'Msgs/s in: <span id="msgs-in">0</span>'
    msgsDiv.appendChild(this.msgsInSparkline.getElement())
    msgsDiv.innerHTML += '<br>Msgs/s out: <span id="msgs-out">0</span>'
    msgsDiv.appendChild(this.msgsOutSparkline.getElement())
    statsContainer.appendChild(msgsDiv)

    this.networkDisplay.appendChild(statsContainer)
    this.panel.appendChild(this.networkDisplay)

    // Username Display
    this.usernameDisplay = document.createElement('div')
    this.usernameDisplay.style.marginBottom = '10px'
    this.panel.appendChild(this.usernameDisplay)

    // Player ID Display
    this.playerIdDisplay = document.createElement('div')
    this.playerIdDisplay.style.marginBottom = '10px'
    this.panel.appendChild(this.playerIdDisplay)

    // FX Buttons
    this.fxButtons = document.createElement('div')
    this.fxButtons.style.marginBottom = '10px'
    this.panel.appendChild(this.fxButtons)
    this.setupFxButtons()

    // Error Display
    this.errorDisplay = document.createElement('div')
    this.errorDisplay.style.color = 'red'
    this.panel.appendChild(this.errorDisplay)
  }

  private setupFxButtons() {
    const createButton = (label: string, onClick: () => void) => {
      const button = document.createElement('button')
      button.textContent = label
      button.style.marginRight = '5px'
      button.style.marginBottom = '5px'
      button.style.padding = '5px 10px'
      button.style.backgroundColor = '#444'
      button.style.color = 'white'
      button.style.border = 'none'
      button.style.borderRadius = '3px'
      button.style.cursor = 'pointer'
      button.addEventListener('click', onClick)
      return button
    }

    // Add buttons for each sound effect
    const dummyPosition = new THREE.Vector3(0, 1, 0)
    this.fxButtons.appendChild(
      createButton('Collision', () => {
        this.audioManager.playCollisionSounds(dummyPosition)
      })
    )
  }

  private setupErrorHandling() {
    // Store original console.error
    const originalError = console.error
    console.error = (...args) => {
      // Call original console.error
      originalError.apply(console, args)

      // Add to our error list
      const errorMessage = args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ')

      this.consoleErrors.push(errorMessage)
      // Keep only last 5 errors
      if (this.consoleErrors.length > 5) {
        this.consoleErrors.shift()
      }

      // Update gear icon color
      this.gearIcon.style.color = 'red'
    }

    // Clear errors when panel is opened
    this.gearIcon.addEventListener('click', () => {
      if (this.panel.style.display === 'none') {
        this.gearIcon.style.color = ''
      }
    })
  }

  public update() {
    const now = performance.now()
    this.frameCount++

    // Update FPS every 500ms
    if (now - this.lastFpsUpdate >= this.updateInterval) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate))
      this.frameCount = 0
      this.lastFpsUpdate = now

      // Update displays
      this.fpsDisplay.textContent = `FPS: ${this.fps}`
      this.usernameDisplay.textContent = `Username: ${this.car.getUsername() || 'Anonymous'}`
      this.playerIdDisplay.textContent = `Player ID: ${this.car.getPlayerId() || 'Not connected'}`

      // Update total message counts
      document.getElementById('total-msgs-in')!.textContent = this.totalMsgsIn.toString()
      document.getElementById('total-msgs-out')!.textContent = this.totalMsgsOut.toString()

      // Update metrics every second
      if (now - this.lastMetricsUpdate >= 1000) {
        // Store current second's rates in window arrays
        this.updateWindowArray(this.bytesInWindow, this.currentSecondBytesIn)
        this.updateWindowArray(this.bytesOutWindow, this.currentSecondBytesOut)
        this.updateWindowArray(this.msgsInWindow, this.currentSecondMsgsIn)
        this.updateWindowArray(this.msgsOutWindow, this.currentSecondMsgsOut)

        // Reset current second counters
        this.currentSecondBytesIn = 0
        this.currentSecondBytesOut = 0
        this.currentSecondMsgsIn = 0
        this.currentSecondMsgsOut = 0

        // Calculate averages
        const avgBytesIn = this.calculateAverage(this.bytesInWindow)
        const avgBytesOut = this.calculateAverage(this.bytesOutWindow)
        const avgMsgsIn = this.calculateAverage(this.msgsInWindow)
        const avgMsgsOut = this.calculateAverage(this.msgsOutWindow)

        // Update sparklines with the averages
        this.bytesInSparkline.addValue(avgBytesIn / 1024) // Convert to KB
        this.bytesOutSparkline.addValue(avgBytesOut / 1024)
        this.msgsInSparkline.addValue(avgMsgsIn)
        this.msgsOutSparkline.addValue(avgMsgsOut)

        // Update displays
        document.getElementById('bytes-in')!.textContent = (avgBytesIn / 1024).toFixed(1)
        document.getElementById('bytes-out')!.textContent = (avgBytesOut / 1024).toFixed(1)
        document.getElementById('msgs-in')!.textContent = avgMsgsIn.toFixed(1)
        document.getElementById('msgs-out')!.textContent = avgMsgsOut.toFixed(1)

        this.lastMetricsUpdate = now
      }

      // Update error display
      if (this.consoleErrors.length > 0) {
        this.errorDisplay.innerHTML = this.consoleErrors
          .map((err) => `<div style="margin-bottom: 5px;">${err}</div>`)
          .join('')
      } else {
        this.errorDisplay.textContent = ''
      }
    }

    requestAnimationFrame(() => this.update())
  }

  private updateWindowArray(arr: number[], value: number) {
    if (arr.length < this.WINDOW_SIZE) {
      // Still building up the window, just push
      arr.push(value)
    } else {
      // Window is full, use rotating index
      arr[this.windowIndex] = value
      this.windowIndex = (this.windowIndex + 1) % this.WINDOW_SIZE
    }
  }

  private calculateAverage(arr: number[]): number {
    if (arr.length === 0) return 0
    const sum = arr.reduce((acc, val) => acc + val, 0)
    return sum / arr.length
  }
}
