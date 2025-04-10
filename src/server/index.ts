import type { VibescaleServer } from './VibescaleServer'
export { VibescaleServer } from './VibescaleServer'

interface Env {
  VIBESCALE: DurableObjectNamespace<VibescaleServer>
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    }

    const url = new URL(request.url)
    const path = url.pathname

    console.log('path', path)

    const [junk, roomName] = path.split('/')

    if (roomName) {
      console.log('roomName', roomName)
      const id = env.VIBESCALE.idFromName(roomName)
      const stub = env.VIBESCALE.get(id)
      return stub.fetch(request)
    }
    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    return new Response('Vibeverse is healthy. Try /<room-name>', { status: 200, headers: corsHeaders })
  },
}

export default worker
