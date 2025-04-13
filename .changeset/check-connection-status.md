---
'vibescale': patch
---

- Added `isConnected()` method to Room interface to check WebSocket connection status
- Returns boolean indicating if the room's WebSocket connection is currently open
- Useful for checking connection state before performing operations that require server communication
