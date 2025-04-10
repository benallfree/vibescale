import * as THREE from 'three'

export function createTextTexture(text: string): THREE.Texture {
  // Create a canvas to draw the text
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!

  // First, use a test size to measure the text's natural aspect ratio
  const testSize = 100
  context.font = `${testSize}px Creepster`
  const metrics = context.measureText(text)

  // Get the full height including any hanging characters
  const textWidth = metrics.width
  const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
  const textAspectRatio = textWidth / textHeight

  // Our target space has aspect ratio of 4.4 (2.2/0.5)
  const targetAspectRatio = 2.2 / 0.5

  // Set canvas size to match target aspect ratio
  canvas.width = 2048
  canvas.height = Math.floor(canvas.width / targetAspectRatio)

  // Calculate the maximum possible font size that will fit
  // Account for outline in the size calculation (outline is fontSize/8)
  const outlineScale = 1.25 * 0.9 // Scale up to account for outline taking space, then scale down to 90%
  const maxFontSize =
    textAspectRatio > targetAspectRatio
      ? (canvas.width * outlineScale) / textAspectRatio // Width constrained
      : canvas.height * outlineScale // Height constrained

  // Clear background
  context.clearRect(0, 0, canvas.width, canvas.height)

  // Configure text style with calculated size
  context.font = `${maxFontSize}px Creepster`
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  // Draw text with white outline
  const x = canvas.width / 2
  const y = canvas.height / 2
  context.strokeStyle = 'white'
  context.lineWidth = maxFontSize / 8
  context.strokeText(text, x, y)

  // Draw black text
  context.fillStyle = 'black'
  context.fillText(text, x, y)

  // Create texture from canvas
  const texture = new THREE.Texture(canvas)
  texture.needsUpdate = true

  return texture
}
