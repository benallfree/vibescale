export class Sparkline {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private data: number[]
  private color: string
  private width: number
  private height: number
  private maxValue: number
  private readonly MAX_DATA_POINTS = 60

  constructor(width = 60, height = 20, color = '#4ade80') {
    this.width = width
    this.height = height
    this.color = color
    this.data = []

    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.canvas.style.display = 'inline-block'
    this.canvas.style.verticalAlign = 'middle'
    this.canvas.style.marginLeft = '5px'

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx
    this.maxValue = 1 // Will be updated when data is set
  }

  setData(data: number[]) {
    this.data = data
    this.maxValue = Math.max(...data, 1) // Ensure we don't divide by zero
    this.draw()
  }

  addValue(value: number) {
    // Add new value to data array
    this.data.push(value)

    // Remove oldest value if we exceed max size
    if (this.data.length > this.MAX_DATA_POINTS) {
      this.data.shift()
    }

    // Update max value and redraw
    this.maxValue = Math.max(...this.data, 1) // Ensure we don't divide by zero
    this.draw()
  }

  private draw() {
    const { ctx, width, height, data, maxValue, color } = this

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw sparkline
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 1

    const step = width / (data.length - 1)

    data.forEach((value, i) => {
      const x = i * step
      const y = height - (value / maxValue) * height

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()
  }

  getElement(): HTMLCanvasElement {
    return this.canvas
  }
}
