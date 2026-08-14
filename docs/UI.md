# UI 组件库（shadcn-vue / Reka UI）

共享前端 `web/` 使用 **Reka UI** 原语 + **shadcn-vue** 生成组件，再经 **`src/ui`** 封装成 Fluix 风格的应用组件。

## 分层

| 层              | 路径                  | 用途                                                |
| --------------- | --------------------- | --------------------------------------------------- |
| 原语 / 生成组件 | `src/components/ui/*` | CLI 生成，尽量少直接改业务                          |
| 应用封装        | `src/ui/*`            | 业务优先导入：`AppButton`、`AppInput`、`AppDialog`… |
| 平台            | `src/lib/platform.ts` | `web` / `desktop` / `android`                       |

```ts
import { AppButton, AppField, AppInput, openAppSettings } from '@/ui'
```

## 平台约定（为 Android 铺路）

- `canUseWindowChrome()`：自定义标题栏、拖窗、独立设置窗（仅 desktop）
- `canUseSystemTray()`：托盘与「关到托盘」
- `preferSettingsWindow()`：桌面开独立窗；Web/Android 走 `#/settings`（日后可改 `AppSheet`）
- `preferTouchTargets()`：粗指针 / Android 时放大控件
- **桌面右键**：`installDesktopContextMenuGuard()` 拦截系统菜单；业务用 `onDesktopContextMenu(handler)` 按需注册（见 `web/src/lib/contextMenu.ts`，也可从 `@/lib/window` 导入）

## 增补 shadcn 组件

```bash
cd web
npx shadcn-vue@latest add <name> -y
```

主题色已映射到 Fluix CSS 变量（见 `src/styles/base.css`）。勿让 `@theme inline` 覆盖 Fluix 的 `--color-muted`（正文次要色）。
