# vibescale

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
