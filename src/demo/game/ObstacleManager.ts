import * as THREE from 'three'

export class ObstacleManager {
  private scene: THREE.Scene
  private polls: THREE.Mesh[] = []
  private obstacles: THREE.Mesh[] = []
  private walls: THREE.Mesh[] = []
  private readonly ARENA_SIZE = 50 // Half-size of the arena
  private readonly WALL_HEIGHT = 5

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.initializeObstacles()
  }

  private initializeObstacles(): void {
    this.createBoxObstacles()
    this.createPollObstacles()
    this.createWalls()
  }

  private createBoxObstacles(): void {
    const obstacleGeometry = new THREE.BoxGeometry(3, 3, 3)
    const obstacleMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 })

    const obstaclePositions = [
      { x: -10, z: 10 },
      { x: 10, z: -10 },
      { x: -15, z: -15 },
      { x: 15, z: 15 },
      { x: 0, z: 20 },
      { x: 20, z: 0 },
    ]

    obstaclePositions.forEach((pos) => {
      const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial)
      obstacle.position.set(pos.x, 1.5, pos.z)
      obstacle.castShadow = true
      obstacle.receiveShadow = true
      obstacle.userData.type = 'obstacle'
      this.scene.add(obstacle)
      this.obstacles.push(obstacle)
    })
  }

  private createPollObstacles(): void {
    const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 4, 32)
    const cylinderMaterial = new THREE.MeshPhongMaterial({ color: 0x4a4a4a })

    const cylinderPositions = [
      { x: 5, z: 5 },
      { x: -5, z: -5 },
      { x: -20, z: 5 },
      { x: 5, z: -20 },
    ]

    cylinderPositions.forEach((pos) => {
      const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial)
      cylinder.position.set(pos.x, 2, pos.z)
      cylinder.castShadow = true
      cylinder.receiveShadow = true
      cylinder.userData.type = 'poll'
      this.scene.add(cylinder)
      this.polls.push(cylinder)
    })
  }

  private createWalls(): void {
    const wallGeometry = new THREE.BoxGeometry(1, this.WALL_HEIGHT, this.ARENA_SIZE * 2)
    const wallMaterial = new THREE.MeshPhongMaterial({
      color: 0x808080,
      transparent: true,
      opacity: 0.5,
    })

    // Create four walls
    const wallPositions = [
      { pos: new THREE.Vector3(this.ARENA_SIZE, this.WALL_HEIGHT / 2, 0), rot: 0 }, // Right wall
      { pos: new THREE.Vector3(-this.ARENA_SIZE, this.WALL_HEIGHT / 2, 0), rot: 0 }, // Left wall
      { pos: new THREE.Vector3(0, this.WALL_HEIGHT / 2, this.ARENA_SIZE), rot: Math.PI / 2 }, // Front wall
      { pos: new THREE.Vector3(0, this.WALL_HEIGHT / 2, -this.ARENA_SIZE), rot: Math.PI / 2 }, // Back wall
    ]

    wallPositions.forEach(({ pos, rot }) => {
      const wall = new THREE.Mesh(wallGeometry, wallMaterial)
      wall.position.copy(pos)
      wall.rotation.y = rot
      wall.castShadow = true
      wall.receiveShadow = true
      wall.userData.type = 'wall'
      this.scene.add(wall)
      this.walls.push(wall)
    })
  }

  public getPolls(): THREE.Mesh[] {
    return this.polls
  }

  public getObstacles(): THREE.Mesh[] {
    return this.obstacles
  }

  public getWalls(): THREE.Mesh[] {
    return this.walls
  }
}
