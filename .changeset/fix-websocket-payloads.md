---
'vibescale': patch
---

Fixed WebSocket event payloads in documentation to match implementation:

- `Rx` event now correctly returns `MessageEvent` directly
- `Tx` event now correctly returns `WebSocketMessage<T, M>` directly
