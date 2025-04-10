import { AudioManager } from '../game/AudioManager'
import { NetworkManager } from '../game/NetworkManager'
import { UserManager } from '../game/UserManager'

export class SplashScreen {
  private container: HTMLDivElement
  private playButton: HTMLButtonElement
  private title: HTMLHeadingElement
  private subtitle: HTMLHeadingElement
  private featuresContainer: HTMLDivElement = document.createElement('div')
  private instructionsContainer: HTMLDivElement = document.createElement('div')
  private usernameInput: HTMLInputElement
  private isConnected = false

  constructor(
    private networkManager: NetworkManager,
    private audioManager: AudioManager,
    private userManager: UserManager
  ) {
    this.container = document.createElement('div')
    this.container.className =
      'fixed inset-0 flex flex-col items-center bg-gradient-to-b from-black/85 to-black/85 z-50 overflow-y-auto'

    const headerSection = document.createElement('div')
    headerSection.className =
      'flex flex-col items-center w-full px-8 py-16 bg-gradient-to-b from-black/50 to-transparent sticky top-0'

    this.title = document.createElement('h1')
    this.title.className =
      'font-inter text-6xl md:text-8xl font-bold text-success tracking-tighter mb-2 drop-shadow-[0_0_20px_rgba(76,175,80,0.3)]'
    this.title.textContent = 'GoodVibes'
    headerSection.appendChild(this.title)

    this.subtitle = document.createElement('h2')
    this.subtitle.className =
      'font-inter text-2xl md:text-3xl text-white/90 mb-8 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]'
    this.subtitle.textContent = 'Vibescale Game Starter Kit'
    headerSection.appendChild(this.subtitle)

    this.usernameInput = document.createElement('input')
    this.setupUsernameInput()
    headerSection.appendChild(this.usernameInput)

    this.playButton = document.createElement('button')
    this.setupPlayButton()
    headerSection.appendChild(this.playButton)

    this.container.appendChild(headerSection)

    const contentSection = document.createElement('div')
    contentSection.className = 'flex flex-col items-center w-full max-w-4xl px-8 pb-16 flex-1'

    this.setupFeatures()
    contentSection.appendChild(this.featuresContainer)

    this.setupInstructions()
    contentSection.appendChild(this.instructionsContainer)

    this.container.appendChild(contentSection)

    this.setupNetworkListeners()
  }

  private setupFeatures() {
    this.featuresContainer.className = 'flex flex-col gap-4 mb-12 text-center w-full'

    const features = [
      '🎮 Build Multiplayer Web Games Fast',
      '🌐 Real-time WebSocket Networking',
      '🚀 Cloudflare Edge Deployment',
      '⚡ Vite + TypeScript + Three.js',
      '🔌 Durable Objects for Game State',
    ]

    features.forEach((feature) => {
      const featureElement = document.createElement('div')
      featureElement.className =
        'font-inter text-lg text-white p-4 bg-white/10 rounded-lg hover:bg-white/15 hover:-translate-y-1 transition-all duration-300'
      featureElement.textContent = feature
      this.featuresContainer.appendChild(featureElement)
    })
  }

  private setupInstructions() {
    const instructions = document.createElement('div')
    instructions.className = 'flex flex-col gap-4'

    const devTitle = document.createElement('div')
    devTitle.className = 'font-inter text-lg font-bold text-success mt-4'
    devTitle.textContent = 'Development:'

    const devCommands = document.createElement('code')
    devCommands.className = 'font-mono text-sm text-white bg-black/50 p-4 rounded-lg whitespace-pre block'
    devCommands.textContent = 'bunx tiged benallfree/goodvibes my-new-vibe\ncd my-new-vibe\nbun i\nbun run dev'

    const deployTitle = document.createElement('div')
    deployTitle.className = 'font-inter text-lg font-bold text-success mt-4'
    deployTitle.textContent = 'Deployment:'

    const deployCommands = document.createElement('code')
    deployCommands.className = 'font-mono text-sm text-white bg-black/50 p-4 rounded-lg whitespace-pre block'
    deployCommands.textContent = 'bun run build\nbun run deploy'

    instructions.appendChild(devTitle)
    instructions.appendChild(devCommands)
    instructions.appendChild(deployTitle)
    instructions.appendChild(deployCommands)

    this.instructionsContainer.className = 'bg-black/30 rounded-xl p-8 w-full'
    this.instructionsContainer.appendChild(instructions)
  }

  private setupUsernameInput() {
    this.usernameInput.type = 'text'
    this.usernameInput.className =
      'input input-bordered input-success w-full max-w-xs text-center mb-4 text-lg bg-white/90 placeholder-gray-500'
    this.usernameInput.placeholder = 'Enter your username'
    this.usernameInput.value = this.userManager.getUsername() || ''
  }

  private setupPlayButton() {
    this.playButton.className =
      'btn btn-success btn-lg text-xl mb-12 px-16 hover:scale-105 transition-transform duration-300'
    this.playButton.textContent = 'Play'
    this.playButton.disabled = true

    this.playButton.addEventListener('click', () => this.handlePlay())
  }

  private setupNetworkListeners() {
    this.networkManager.onConnect(() => {
      this.isConnected = true
      this.playButton.disabled = false
    })
  }

  private handlePlay() {
    if (!this.isConnected) return

    const username = this.usernameInput.value.trim()
    if (username) {
      this.userManager.setUsername(username)
    }

    this.networkManager.forceStateUpdate()
    this.audioManager.playBackgroundMusic()

    this.container.style.transition = 'opacity 1s ease'
    this.container.style.opacity = '0'
    setTimeout(() => {
      this.container.remove()
    }, 1000)
  }

  public show(): void {
    document.body.appendChild(this.container)
  }
}
