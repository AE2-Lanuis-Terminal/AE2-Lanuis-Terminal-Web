/**
 * Mock HTTP：默认 8765，CORS 开放；图标返回 1×1 PNG。
 */
import http from 'node:http'
import { dispatchMock, MockHttpError, PLACEHOLDER_PNG } from './handlers.ts'

function cors(res: http.ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,HEAD,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function headerMap(req: http.IncomingMessage): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') out[k] = v
    else if (Array.isArray(v) && v[0]) out[k] = v[0]
  }
  return out
}

export function startMockHttp(port: number) {
  const server = http.createServer(async (req, res) => {
    cors(res)
    const method = (req.method || 'GET').toUpperCase()
    const url = req.url || '/'

    if (method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const iconMatch = /^\/api\/v1\/icons\/(item|fluid)\/([^/]+)\/(.+)$/.exec(url.split('?')[0] || '')
    if (iconMatch && (method === 'GET' || method === 'HEAD')) {
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Cache-Control': 'max-age=604800',
        'Content-Length': PLACEHOLDER_PNG.length,
      })
      if (method === 'GET') res.end(PLACEHOLDER_PNG)
      else res.end()
      return
    }

    try {
      let data: unknown
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        const raw = await readBody(req)
        data = raw ? JSON.parse(raw) : {}
      }
      const result = await dispatchMock({
        method,
        url,
        data,
        headers: headerMap(req),
      })
      const body = JSON.stringify(result)
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(body)
    } catch (err) {
      if (err instanceof MockHttpError) {
        const body = JSON.stringify({ error: { code: err.code, message: err.message } })
        res.writeHead(err.status, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(body)
        return
      }
      if (err instanceof SyntaxError) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ error: { code: 'bad_json', message: 'Invalid JSON body' } }))
        return
      }
      console.error('[mock-server]', err)
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: { code: 'internal', message: 'Internal mock error' } }))
    }
  })

  server.listen(port, '0.0.0.0')
  return server
}
