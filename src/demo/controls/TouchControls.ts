export interface JoystickState {
  x: number
  y: number
}

export class TouchControls {
  private moveJoystick: HTMLElement
  private rotateJoystick: HTMLElement
  private moveState: JoystickState = { x: 0, y: 0 }
  private rotateState: JoystickState = { x: 0, y: 0 }
  private activeTouches: Map<number, { joystick: HTMLElement; startX: number; startY: number }> = new Map()
  private activeMouseJoystick: { joystick: HTMLElement; startX: number; startY: number } | null = null

  constructor() {
    this.moveJoystick = document.getElementById('move-joystick') as HTMLElement
    this.rotateJoystick = document.getElementById('rotate-joystick') as HTMLElement
    this.setupTouchEvents()
    this.setupMouseEvents()
  }

  private setupTouchEvents(): void {
    document.addEventListener('touchstart', (e) => this.handleTouchStart(e))
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e))
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e))
  }

  private setupMouseEvents(): void {
    this.moveJoystick.addEventListener('mousedown', (e) => this.handleMouseDown(e))
    this.rotateJoystick.addEventListener('mousedown', (e) => this.handleMouseDown(e))
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e))
    document.addEventListener('mouseup', () => this.handleMouseUp())
  }

  private handleMouseDown(e: MouseEvent): void {
    const joystick = e.currentTarget as HTMLElement
    const rect = joystick.getBoundingClientRect()
    this.activeMouseJoystick = {
      joystick,
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.activeMouseJoystick) return

    const dx = e.clientX - this.activeMouseJoystick.startX
    const dy = e.clientY - this.activeMouseJoystick.startY
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), 35)
    const angle = Math.atan2(dy, dx)

    const x = Math.cos(angle) * distance
    const y = Math.sin(angle) * distance

    const knob = this.activeMouseJoystick.joystick.querySelector('.joystick-knob') as HTMLElement
    knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`

    if (this.activeMouseJoystick.joystick === this.moveJoystick) {
      this.moveState = {
        x: x / 35,
        y: -y / 35,
      }
    } else {
      this.rotateState = {
        x: x / 35,
        y: -y / 35,
      }
    }
  }

  private handleMouseUp(): void {
    if (!this.activeMouseJoystick) return

    const knob = this.activeMouseJoystick.joystick.querySelector('.joystick-knob') as HTMLElement
    knob.style.transform = 'translate(-50%, -50%)'

    if (this.activeMouseJoystick.joystick === this.moveJoystick) {
      this.moveState = { x: 0, y: 0 }
    } else {
      this.rotateState = { x: 0, y: 0 }
    }

    this.activeMouseJoystick = null
  }

  private handleTouchStart(e: TouchEvent): void {
    Array.from(e.changedTouches).forEach((touch) => {
      const moveJoystickRect = this.moveJoystick.getBoundingClientRect()
      const rotateJoystickRect = this.rotateJoystick.getBoundingClientRect()

      if (this.isPointInRect(touch.clientX, touch.clientY, moveJoystickRect)) {
        this.activeTouches.set(touch.identifier, {
          joystick: this.moveJoystick,
          startX: moveJoystickRect.left + moveJoystickRect.width / 2,
          startY: moveJoystickRect.top + moveJoystickRect.height / 2,
        })
      } else if (this.isPointInRect(touch.clientX, touch.clientY, rotateJoystickRect)) {
        this.activeTouches.set(touch.identifier, {
          joystick: this.rotateJoystick,
          startX: rotateJoystickRect.left + rotateJoystickRect.width / 2,
          startY: rotateJoystickRect.top + rotateJoystickRect.height / 2,
        })
      }
    })
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault()
    Array.from(e.changedTouches).forEach((touch) => {
      const touchData = this.activeTouches.get(touch.identifier)
      if (!touchData) return

      const dx = touch.clientX - touchData.startX
      const dy = touch.clientY - touchData.startY
      const distance = Math.min(Math.sqrt(dx * dx + dy * dy), 35)
      const angle = Math.atan2(dy, dx)

      const x = Math.cos(angle) * distance
      const y = Math.sin(angle) * distance

      const knob = touchData.joystick.querySelector('.joystick-knob') as HTMLElement
      knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`

      if (touchData.joystick === this.moveJoystick) {
        this.moveState = {
          x: x / 35,
          y: -y / 35,
        }
      } else {
        this.rotateState = {
          x: x / 35,
          y: -y / 35,
        }
      }
    })
  }

  private handleTouchEnd(e: TouchEvent): void {
    Array.from(e.changedTouches).forEach((touch) => {
      const touchData = this.activeTouches.get(touch.identifier)
      if (!touchData) return

      const knob = touchData.joystick.querySelector('.joystick-knob') as HTMLElement
      knob.style.transform = 'translate(-50%, -50%)'

      if (touchData.joystick === this.moveJoystick) {
        this.moveState = { x: 0, y: 0 }
      } else {
        this.rotateState = { x: 0, y: 0 }
      }

      this.activeTouches.delete(touch.identifier)
    })
  }

  private isPointInRect(x: number, y: number, rect: DOMRect): boolean {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  }

  public getMoveState(): JoystickState {
    return this.moveState
  }

  public getRotateState(): JoystickState {
    return this.rotateState
  }
}
