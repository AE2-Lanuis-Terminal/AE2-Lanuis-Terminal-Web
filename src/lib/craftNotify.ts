/**
 * Tauri 壳：合成完成时发系统通知（桌面托盘 / Android 通知栏）。
 * 纯 Web 无后台通知能力，仅依赖应用内 Toast。
 */

import { isTauri } from './platform'
import { stripMcFormat } from './mcFormat'
import { i18n } from '../i18n'

const CHANNEL_ID = 'ae2-craft-complete'

let permissionOk: boolean | null = null
let channelReady = false

function tt(key: string) {
  return String(i18n.global.t(key))
}

/** 请求通知权限（开启「完成推送」或开始监听时调用） */
export async function ensureCraftNotifyPermission(): Promise<boolean> {
  if (!isTauri()) return false
  if (permissionOk === true) return true
  try {
    const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification')
    let granted = await isPermissionGranted()
    if (!granted) {
      const state = await requestPermission()
      granted = state === 'granted'
    }
    permissionOk = granted
    return granted
  } catch {
    permissionOk = false
    return false
  }
}

async function ensureCraftChannel() {
  if (channelReady) return
  try {
    const { createChannel, Importance, Visibility } = await import('@tauri-apps/plugin-notification')
    await createChannel({
      id: CHANNEL_ID,
      name: tt('jobs.notifyChannel'),
      description: tt('jobs.notifyChannelDesc'),
      importance: Importance.High,
      visibility: Visibility.Public,
      lights: true,
      vibration: true,
    })
    channelReady = true
  } catch {
    /* 桌面可无 channel；Android 失败时仍尝试默认通道发送 */
  }
}

/** 发送一条合成完成系统通知 */
export async function notifyCraftComplete(opts: { cpuName: string; displayName?: string; detail?: string }): Promise<void> {
  if (!isTauri()) return
  const ok = await ensureCraftNotifyPermission()
  if (!ok) return
  await ensureCraftChannel()
  const title = tt('jobs.completeToast')
  const item = opts.displayName ? stripMcFormat(opts.displayName) : ''
  const body = [item, opts.cpuName].filter(Boolean).join(' · ') || opts.detail || opts.cpuName
  try {
    const { sendNotification } = await import('@tauri-apps/plugin-notification')
    sendNotification({
      title,
      body,
      channelId: CHANNEL_ID,
    })
  } catch {
    /* ignore */
  }
}
