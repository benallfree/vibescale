# vibescale

## 3.0.1

### Patch Changes

- c6b9a59: Include src

## 3.0.0

### Major Changes

- 251395c: Dropped immer and added custom produce function option
- c136b98: Rename room events
- 6c7dc88: Add coordinate converter to room options
- 251395c: Updated to use world<->server position coordinate system
- 41ba818: remove getEndpointUrl from client

### Minor Changes

- 5c1d89a: Add getAllPlayers()
- 358c9b4: Add option to normalize player state
- 69cb6ac: Add state change detector
- e4b3e4a: Export normalizers
- 60d6469: Add AfterLocalPlayerMutated event
- 26c1513: Add default player state normalizer
- 4e18435: Add Player:Mutated event

### Patch Changes

- ac87e6d: MutatePlayer returns player info if available
- 0309406: Add Typescript export
- 877bb76: Rename mutatePlayer

## 2.0.1

### Patch Changes

- 49c0328: Validate roomName in createRoom function

## 2.0.0

### Major Changes

- Complete overhaul of state management and synchronization system:
  - Replaced delta/metadata system with unified PlayerBase type
  - Introduced Immer-based immutable state updates with type-safe mutations
  - Enhanced state change detection with configurable thresholds
  - Optimized server-side state tracking with better type safety
  - Added connection status tracking and error handling
  - Improved player position and rotation synchronization
  - Updated debug panel with improved player visualization

### Minor Changes

- Added interactive Three.js demo application:

  - Created real-time multiplayer cube demo with WASD controls
  - Implemented smooth camera following and player rotation
  - Added visual player synchronization with server-assigned colors
  - Included grid visualization for spatial reference
  - Provided configurable room and endpoint parameters

- Enhanced WebSocket connection handling:
  - Added explicit connect() method for better connection control
  - Improved reconnection logic with exponential backoff
  - Added connection status tracking and error handling
  - Enhanced WebSocket message serialization
  - Added comprehensive event system with type-safe payloads

### Patch Changes

- Client improvements:
  - Enhanced documentation with comprehensive API reference
  - Added detailed integration examples and best practices
  - Improved TypeScript type definitions and generics
  - Updated client package configuration
  - Added LLM-specific integration guide

## 1.0.2

### Patch Changes

- Added llm.md to distro and README

## 1.0.1

### Patch Changes

- Reconnect on fail
- Cosmetics update

## 1.0.0

- Initial release
