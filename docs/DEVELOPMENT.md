# 本地开发（Web）

## 环境

- Node **≥ 24**
- 安装：`npm install --legacy-peer-deps`（不提交 `package-lock.json`；CI 同此）

## 常用脚本

| 命令                         | 说明                                                    |
| ---------------------------- | ------------------------------------------------------- |
| `npm run dev`                | 开发服务器；`VITE_USE_MOCK=true` 时自动起 mock-server   |
| `npm run mock`               | 仅启动 `mock-server/`                                   |
| `npm run build`              | 生产构建 → `dist/`（供主仓嵌入 / Client）               |
| `npm run lint` / `typecheck` | 质量检查                                                |
| `npm run gen:api`            | 从 `openapi/openapi.yaml` 生成 `src/types/generated.ts` |

## 对接真实模组

`.env.development`：

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://127.0.0.1:8765
```

OpenAPI **以主仓为准**；本仓 `openapi/` 为副本，变更后两边对齐并跑 `gen:api`。

## 代码约定

- 文案：`src/locales/{zh-CN,en}.ts`，组件内勿硬编码中文
- 业务组件优先 `@/ui`；底层在 `src/components/ui`（见 [UI.md](UI.md)）
- 平台：`getPlatform()` / `isDesktopChrome()` / `isMobileShell()`（`src/lib/platform.ts`）；**勿**依赖构建期 `TAURI_*`
- 登录页（纯 Web）不改服务器；Client 壳可填 IP
- **勿**在前端仓库内嵌 mock 实现；只用 `mock-server/`

## 与主仓 Gradle

主仓 `settings.gradle` 在存在 `web/build.gradle` 时 `include 'web'`，任务 `npmBuild` 调用本仓 `npm run build`。
