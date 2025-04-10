/// <reference types="vite/client" />
import * as THREE from 'three'
import backgroundMusic from '../../assets/background.mp3'

const screechSoundFiles: Record<string, string> = import.meta.glob('../../assets/fx/screech*.mp3', {
  eager: true,
  as: 'url',
})
const smashSoundFiles: Record<string, string> = import.meta.glob('../../assets/fx/smash*.mp3', {
  eager: true,
  as: 'url',
})

export class AudioManager {
  private listener: THREE.AudioListener
  private smashSounds: THREE.PositionalAudio[] = []
  private screechSounds: THREE.PositionalAudio[] = []
  private audioLoader: THREE.AudioLoader
  private scene: THREE.Scene
  private backgroundMusic?: THREE.Audio
  private shouldPlayOnLoad = false

  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
    this.scene = scene
    this.listener = new THREE.AudioListener()
    camera.add(this.listener)
    this.audioLoader = new THREE.AudioLoader()
  }

  public async initialize(): Promise<void> {
    // Load background music
    this.backgroundMusic = new THREE.Audio(this.listener)
    console.log('Loading background music...')

    try {
      const buffer = await this.loadAudioBuffer(backgroundMusic)
      if (this.backgroundMusic) {
        this.backgroundMusic.setBuffer(buffer)
        this.backgroundMusic.setLoop(true)
        this.backgroundMusic.setVolume(0.05) // Set initial volume to 5%
      }
    } catch (error) {
      console.error('Failed to load background music:', error)
    }

    // Load smash sounds
    await Promise.all(
      Object.values(smashSoundFiles).map(async (file: string, i: number) => {
        const sound = new THREE.PositionalAudio(this.listener)
        try {
          const buffer = await this.loadAudioBuffer(file)
          sound.setBuffer(buffer)
          sound.setRefDistance(5)
          sound.setRolloffFactor(2)
          this.smashSounds.push(sound)
        } catch (error) {
          console.error(`Failed to load smash sound ${i + 1}:`, error)
        }
      })
    )

    // Load screech sounds
    await Promise.all(
      Object.values(screechSoundFiles).map(async (file: string, i: number) => {
        const sound = new THREE.PositionalAudio(this.listener)
        try {
          const buffer = await this.loadAudioBuffer(file)
          sound.setBuffer(buffer)
          sound.setRefDistance(5)
          sound.setRolloffFactor(2)
          this.screechSounds.push(sound)
        } catch (error) {
          console.error(`Failed to load screech sound ${i + 1}:`, error)
        }
      })
    )
  }

  private loadAudioBuffer(file: string): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      this.audioLoader.load(file, resolve, undefined, reject)
    })
  }

  public playBackgroundMusic(): void {
    console.log('Attempting to play background music...')
    if (this.backgroundMusic?.buffer && !this.backgroundMusic.isPlaying) {
      console.log('Playing background music immediately')
      this.backgroundMusic.play()
    } else {
      console.log('Background music not ready, will play when loaded')
      // Set flag to play once buffer is loaded
      this.shouldPlayOnLoad = true
    }
  }

  public stopBackgroundMusic(): void {
    if (this.backgroundMusic?.isPlaying) {
      this.backgroundMusic.stop()
    }
  }

  public setBackgroundMusicVolume(volume: number): void {
    if (this.backgroundMusic) {
      // Clamp volume between 0 and 1
      const clampedVolume = Math.max(0, Math.min(1, volume))
      this.backgroundMusic.setVolume(clampedVolume)
    }
  }

  public playCollisionSounds(position: THREE.Vector3): void {
    // Create a temporary mesh at the collision point to attach the sound to
    const soundObject = new THREE.Object3D()
    soundObject.position.copy(position)
    this.scene.add(soundObject)

    // Play random smash sound
    const smashSound = this.smashSounds[Math.floor(Math.random() * this.smashSounds.length)]
    if (smashSound && smashSound.buffer) {
      if (smashSound.isPlaying) smashSound.stop()
      soundObject.add(smashSound)
      smashSound.play()
    }

    // Play random screech sound
    const screechSound = this.screechSounds[Math.floor(Math.random() * this.screechSounds.length)]
    if (screechSound && screechSound.buffer) {
      if (screechSound.isPlaying) screechSound.stop()
      soundObject.add(screechSound)
      screechSound.play()
    }

    // Remove the sound object from the scene after the sounds finish playing
    // Use the longer of the two sound durations
    const duration = Math.max(smashSound?.buffer?.duration || 0, screechSound?.buffer?.duration || 0) * 1000 // Convert to milliseconds

    setTimeout(() => {
      this.scene.remove(soundObject)
    }, duration + 100) // Add a small buffer to ensure sound completes
  }
}
