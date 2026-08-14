import { startMockHttp } from './http.ts'
import { startMockWs } from './ws.ts'

const httpPort = Number(process.env.MOCK_HTTP_PORT || 8765)
/** 未设或 0：与 HTTP 同端口；显式端口则独立监听 */
const wsEnv = process.env.MOCK_WS_PORT
const wsPort = wsEnv === undefined || wsEnv === '' || wsEnv === '0' ? 0 : Number(wsEnv)
const sameAsHttp = !wsPort || wsPort === httpPort

const httpServer = startMockHttp(httpPort)
if (sameAsHttp) {
  startMockWs({ server: httpServer })
} else {
  startMockWs({ port: wsPort })
}

const publicWs = sameAsHttp ? httpPort : wsPort
console.log(`[mock-server] HTTP http://127.0.0.1:${httpPort}`)
console.log(`[mock-server] WS   ws://127.0.0.1:${publicWs}${sameAsHttp ? ' (same as HTTP)' : ''}`)
console.log(`[mock-server] login any non-empty credentials; account "admin" → OP`)
