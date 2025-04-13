---
'vibescale': patch
---

- Added `getRoomId()` method to Room interface to allow retrieving the room identifier
- Fixed WebSocket event payloads in documentation to match implementation:
  - `Rx` event now correctly returns `MessageEvent` directly
  - `Tx` event now correctly returns `WebSocketMessage<T, M>` directly
