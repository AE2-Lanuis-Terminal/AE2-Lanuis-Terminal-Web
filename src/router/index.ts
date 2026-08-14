/**
 * 路由表：用户终端 / 管理端 / 设置。
 */

import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

/** Hash history：多窗口 / 自定义协议下深链可靠，避免设置窗白屏 */
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'terminal',
      component: () => import('../views/TerminalView.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminView.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAdmin) {
    if (!auth.authenticated || !auth.admin) {
      return { name: 'terminal' }
    }
    if (auth.shellMode !== 'admin' && !auth.pendingModeChoice) {
      // 允许从 act-as 用户端返回时已设 shellMode=admin
      if (auth.shellMode === 'user' && to.name === 'admin') {
        auth.chooseShellMode('admin')
      }
    }
  }
  return true
})
