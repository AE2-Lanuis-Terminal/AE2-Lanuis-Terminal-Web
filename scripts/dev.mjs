/**
 * `npm run dev` 入口：若 VITE_USE_MOCK=true，先拉起独立 mock-server，再启动 Vite。
 * 前端业务仍只走 HTTP/WS，不 import mock。
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvFile(file) {
  const full = path.join(root, file)
  if (!fs.existsSync(full)) return
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i <= 0) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

loadEnvFile('.env')
loadEnvFile('.env.development')
loadEnvFile('.env.local')
loadEnvFile('.env.development.local')

const useMock = String(process.env.VITE_USE_MOCK || '').toLowerCase() === 'true'
const children = []

function killAll() {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
}

process.on('SIGINT', () => {
  killAll()
  process.exit(0)
})
process.on('SIGTERM', () => {
  killAll()
  process.exit(0)
})

async function mockAlreadyUp() {
  const base = (process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8765').replace(/\/$/, '')
  try {
    const res = await fetch(`${base}/api/v1/health`, { signal: AbortSignal.timeout(800) })
    if (!res.ok) return false
    const j = await res.json()
    if (j?.service !== 'ae2lanuis') return false
    // 旧 mock 进程可能仍占端口但缺新路由；探测关键端点
    const probe = await fetch(`${base}/api/v1/pattern-providers`, { signal: AbortSignal.timeout(800) })
    // 401/403 = 路由存在；404 = 旧进程，不可复用
    if (probe.status === 404) return false
    return true
  } catch {
    return false
  }
}

if (useMock) {
  if (!process.env.VITE_API_BASE_URL?.trim()) {
    process.env.VITE_API_BASE_URL = 'http://127.0.0.1:8765'
  }
  if (await mockAlreadyUp()) {
    console.log('[dev] VITE_USE_MOCK=true → mock already running, reuse')
  } else {
    console.log('[dev] VITE_USE_MOCK=true → starting mock-server')
    const mock = spawn('npm', ['--prefix', 'mock-server', 'start'], {
      cwd: root,
      stdio: 'inherit',
      shell: true,
      env: process.env,
    })
    children.push(mock)
    mock.on('exit', (code, signal) => {
      if (signal) return
      if (code && code !== 0) {
        console.error(`[dev] mock-server exited with code ${code}`)
        killAll()
        process.exit(code)
      }
    })
  }
}

const vite = spawn('npx', ['vite'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: process.env,
})
children.push(vite)
vite.on('exit', (code, signal) => {
  killAll()
  process.exit(signal ? 1 : (code ?? 0))
})
