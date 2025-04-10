import type { JoystickState } from './TouchControls'

export class KeyboardControls {
  private moveState: JoystickState = { x: 0, y: 0 }
  private keys = new Set<string>()

  constructor() {
    this.setupKeyboardEvents()
  }

  private setupKeyboardEvents(): void {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e))
    document.addEventListener('keyup', (e) => this.handleKeyUp(e))
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase()
    if (['w', 'a', 's', 'd'].includes(key)) {
      this.keys.add(key)
      this.updateMoveState()
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase()
    if (['w', 'a', 's', 'd'].includes(key)) {
      this.keys.delete(key)
      this.updateMoveState()
    }
  }

  private updateMoveState(): void {
    // Reset move state
    this.moveState = { x: 0, y: 0 }

    // Forward/Backward (W/S)
    if (this.keys.has('w')) this.moveState.y += 1
    if (this.keys.has('s')) this.moveState.y -= 1

    // Left/Right (A/D)
    if (this.keys.has('a')) this.moveState.x -= 1
    if (this.keys.has('d')) this.moveState.x += 1
  }

  public getMoveState(): JoystickState {
    return this.moveState
  }
}
