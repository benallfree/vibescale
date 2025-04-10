import * as THREE from 'three'
import { createTextTexture } from './createTextTexture'

interface CarMeshOptions {
  bodyColor?: number | string
  roofColor?: number
  username?: string
}

export function createCarMesh({
  bodyColor = 0x2196f3,
  roofColor = 0x1976d2,
  username,
}: CarMeshOptions = {}): THREE.Group {
  const carGroup = new THREE.Group()
  carGroup.userData.type = 'player'

  // Car body
  const bodyGeometry = new THREE.BoxGeometry(2, 0.5, 4)
  const bodyMaterial = new THREE.MeshPhongMaterial({ color: bodyColor })
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial)
  bodyMesh.position.y = 0.5
  bodyMesh.castShadow = true
  bodyMesh.receiveShadow = true
  carGroup.add(bodyMesh)

  // Add name textures if username is provided
  if (username) {
    const texture = createTextTexture(username)

    // Left side name - full size of car side
    const leftNameGeometry = new THREE.PlaneGeometry(2.2, 0.5) // Width between wheels (2.2), height matches body
    const leftNameMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const leftNameMesh = new THREE.Mesh(leftNameGeometry, leftNameMaterial)
    leftNameMesh.rotation.y = -Math.PI / 2
    leftNameMesh.position.set(-1.01, 0.5, 0) // Centered on car side
    carGroup.add(leftNameMesh)

    // Right side name - full size of car side
    const rightNameGeometry = new THREE.PlaneGeometry(2.2, 0.5) // Width between wheels (2.2), height matches body
    const rightNameMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const rightNameMesh = new THREE.Mesh(rightNameGeometry, rightNameMaterial)
    rightNameMesh.rotation.y = Math.PI / 2
    rightNameMesh.position.set(1.01, 0.5, 0) // Centered on car side
    carGroup.add(rightNameMesh)

    // Hood name - almost full size of hood
    const hoodNameGeometry = new THREE.PlaneGeometry(1.5, 1.5) // Adjusted to be square but fit within hood
    const hoodNameMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const hoodNameMesh = new THREE.Mesh(hoodNameGeometry, hoodNameMaterial)
    hoodNameMesh.rotation.x = -Math.PI / 2
    hoodNameMesh.position.set(0, 0.51, 1) // Centered on hood
    carGroup.add(hoodNameMesh)

    // Store username in userData for comparison during updates
    carGroup.userData.username = username
  }

  // Car roof
  const roofGeometry = new THREE.BoxGeometry(1.5, 0.4, 2)
  const roofMaterial = new THREE.MeshPhongMaterial({ color: roofColor })
  const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial)
  roofMesh.position.y = 1.2
  carGroup.add(roofMesh)

  // Wheels
  const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 32)
  const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x212121 })

  const wheelPositions = [
    { x: -1.1, z: 1.5 }, // Front Left
    { x: 1.1, z: 1.5 }, // Front Right
    { x: -1.1, z: -1.5 }, // Back Left
    { x: 1.1, z: -1.5 }, // Back Right
  ]

  wheelPositions.forEach((pos) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(pos.x, 0.4, pos.z)
    carGroup.add(wheel)
  })

  // Add bumpers
  const bumperGeometry = new THREE.BoxGeometry(2.2, 0.4, 0.3)
  const bumperMaterial = new THREE.MeshPhongMaterial({ color: 0x424242 })

  const frontBumper = new THREE.Mesh(bumperGeometry, bumperMaterial)
  frontBumper.position.set(0, 0.4, 2)
  carGroup.add(frontBumper)

  const backBumper = new THREE.Mesh(bumperGeometry, bumperMaterial)
  backBumper.position.set(0, 0.4, -2)
  carGroup.add(backBumper)

  // Add headlights
  const headlightGeometry = new THREE.CircleGeometry(0.15, 32)
  const headlightMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1,
  })

  // Front left headlight
  const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial)
  leftHeadlight.position.set(-0.7, 0.6, 2.01)
  carGroup.add(leftHeadlight)

  // Front right headlight
  const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial)
  rightHeadlight.position.set(0.7, 0.6, 2.01)
  carGroup.add(rightHeadlight)

  // Add taillights
  const taillightGeometry = new THREE.CircleGeometry(0.15, 32)
  const taillightMaterial = new THREE.MeshPhongMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 1,
  })

  // Back left taillight
  const leftTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial)
  leftTaillight.position.set(-0.7, 0.6, -2.01)
  carGroup.add(leftTaillight)

  // Back right taillight
  const rightTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial)
  rightTaillight.position.set(0.7, 0.6, -2.01)
  carGroup.add(rightTaillight)

  return carGroup
}
