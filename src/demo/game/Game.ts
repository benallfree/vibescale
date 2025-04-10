import * as THREE from 'three'
import { KeyboardControls } from '../demo/controls/KeyboardControls'
import { TouchControls } from '../demo/controls/TouchControls'
import { SplashScreen } from '../ui/SplashScreen'
import { AudioManager } from './AudioManager'
import { CameraController } from './CameraController'
import { Car } from './Car'
import { DebugPanel } from './DebugPanel'
import { NetworkManager } from './NetworkManager'
import { ObstacleManager } from './ObstacleManager'
import { PlayerManager } from './PlayerManager'
import { UserManager } from './UserManager'

export class Game {
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private car!: Car
  private touchControls!: TouchControls
  private keyboardControls!: KeyboardControls
  private ground!: THREE.Mesh
  private playerManager!: PlayerManager
  private lastUpdateTime = 0
  private lastTime = 0 // Track last frame time
  private cameraController!: CameraController
  private obstacleManager!: ObstacleManager
  private networkManager!: NetworkManager
  private audioManager!: AudioManager
  private debugPanel!: DebugPanel
  private splashScreen!: SplashScreen
  private userManager!: UserManager
  private isInitialized = false

  constructor() {
    // Only do the minimal setup in constructor
    this.initializeScene()
    this.initializeCamera()
    this.initializeRenderer()
    window.addEventListener('resize', () => this.handleResize())
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      this.userManager = new UserManager()
      await this.initializeAudio()
      this.initializeControls()
      this.initializeCar()
      await this.initializeMultiplayer()
      this.initializeGround()
      this.initializeObstacles()
      this.initializeLighting()
      this.initializeDebugPanel()
      this.initializeSplashScreen()

      this.isInitialized = true
      this.animate()
    } catch (error) {
      console.error('Failed to initialize game:', error)
      throw error
    }
  }

  private initializeScene(): void {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)
  }

  private initializeCamera(): void {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.cameraController = new CameraController(this.camera)
  }

  private initializeRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    document.getElementById('game-container')?.appendChild(this.renderer.domElement)
  }

  private async initializeAudio(): Promise<void> {
    this.audioManager = new AudioManager(this.camera, this.scene)
    await this.audioManager.initialize()
  }

  private initializeControls(): void {
    this.touchControls = new TouchControls()
    this.keyboardControls = new KeyboardControls()
  }

  private initializeCar(): void {
    this.car = new Car()
    this.car.setAudioManager(this.audioManager)
    this.scene.add(this.car.getMesh())
  }

  private async initializeMultiplayer(): Promise<void> {
    this.playerManager = new PlayerManager(this.scene)
    this.playerManager.setAudioManager(this.audioManager)
    this.networkManager = new NetworkManager(this.playerManager, this.car, this.userManager)
    await this.networkManager.connect()
  }

  private initializeGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(100, 100)
    const groundMaterial = new THREE.MeshPhongMaterial({
      color: 0x3e8948,
      side: THREE.DoubleSide,
    })
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial)
    this.ground.rotation.x = Math.PI / 2
    this.ground.receiveShadow = true
    this.scene.add(this.ground)

    const gridHelper = new THREE.GridHelper(100, 50, 0x000000, 0x000000)
    gridHelper.position.y = 0.01
    this.scene.add(gridHelper)
  }

  private initializeObstacles(): void {
    this.obstacleManager = new ObstacleManager(this.scene)
    this.car.setPollObjects(this.obstacleManager.getPolls())
    this.car.setObstacles(this.obstacleManager.getObstacles())
    this.car.setWalls(this.obstacleManager.getWalls())
  }

  private initializeLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 20, 10)
    directionalLight.castShadow = true
    this.scene.add(directionalLight)
  }

  private initializeDebugPanel(): void {
    this.debugPanel = new DebugPanel(this.car, this.audioManager, this.networkManager.getWebSocketClient())
  }

  private initializeSplashScreen(): void {
    this.splashScreen = new SplashScreen(this.networkManager, this.audioManager, this.userManager)
    this.splashScreen.show()
  }

  private handleResize(): void {
    this.cameraController.handleResize()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private animate = (): void => {
    const currentTime = performance.now()
    const deltaTime = (currentTime - this.lastTime) / 1000 // Convert to seconds
    this.lastTime = currentTime

    requestAnimationFrame(this.animate)

    // Update car with other players for collision detection
    this.car.setOtherPlayers(this.playerManager.getPlayers())

    // Combine touch and keyboard inputs
    const touchState = this.touchControls.getMoveState()
    const keyboardState = this.keyboardControls.getMoveState()
    const combinedState = {
      x: touchState.x + keyboardState.x,
      y: touchState.y + keyboardState.y,
    }

    this.car.update(combinedState, deltaTime)

    this.lastUpdateTime = this.networkManager.updatePlayerState(this.lastUpdateTime)

    // Update player interpolation
    this.playerManager.update()

    this.cameraController.update(this.car)

    this.renderer.render(this.scene, this.camera)
  }
}
