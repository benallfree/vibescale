import * as THREE from 'three'

export function createTextSprite(text: string): THREE.Sprite {
  // Create a canvas to draw the text
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!

  // Set canvas size
  canvas.width = 256
  canvas.height = 64

  // Configure text style
  context.font = 'Bold 32px Arial'
  context.fillStyle = 'white'
  context.strokeStyle = 'black'
  context.lineWidth = 4

  // Center the text
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  // Draw text with outline
  const x = canvas.width / 2
  const y = canvas.height / 2
  context.strokeText(text, x, y)
  context.fillText(text, x, y)

  // Create sprite from canvas
  const texture = new THREE.Texture(canvas)
  texture.needsUpdate = true

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    sizeAttenuation: true,
  })

  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.scale.set(2, 0.5, 1)

  return sprite
}
