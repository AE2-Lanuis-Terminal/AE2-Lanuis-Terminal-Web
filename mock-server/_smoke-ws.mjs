import WebSocket from 'ws'

const login = await fetch('http://127.0.0.1:8765/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ account: 'Steve', password: 'x' }),
}).then((r) => r.json())

const ws = new WebSocket('ws://127.0.0.1:8766')
await new Promise((res, rej) => {
  ws.on('open', res)
  ws.on('error', rej)
})

function wait(type) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting ${type}`)), 5000)
    const onMsg = (data) => {
      const msg = JSON.parse(String(data))
      if (msg.type === type) {
        clearTimeout(t)
        ws.off('message', onMsg)
        resolve(msg)
      }
    }
    ws.on('message', onMsg)
  })
}

const hello = await wait('hello')
ws.send(JSON.stringify({ type: 'auth', token: login.token }))
const ok = await wait('auth_ok')
ws.send(JSON.stringify({ type: 'subscribe', channel: 'storage', page: 1, pageSize: 2 }))
const snap = await wait('storage.snapshot')
console.log(JSON.stringify({ hello: hello.type, auth: ok.account, snapItems: snap.items?.length, total: snap.total }))
ws.close()
process.exit(0)
