# AE2 Lanuis Mock Server

独立 Node 服务，协议对齐主仓 OpenAPI + `docs/websocket.md`。
前端 **零侵入**：不 import mock，只把 HTTP/WS 指到本服务。

## 启动

推荐（自动）：在 Web 仓 `.env.development` 设：

```
VITE_USE_MOCK=true
VITE_API_BASE_URL=http://127.0.0.1:8765
```

然后：

```bash
npm run dev
```

会先拉起本服务再启动 Vite。未设 `VITE_API_BASE_URL` 时，dev 脚本会默认 `http://127.0.0.1:8765`。

仅 Mock（不启前端）：

```bash
npm run mock
```

默认端口：

| 服务      | 端口                                                                  |
| --------- | --------------------------------------------------------------------- |
| HTTP      | `8765`（`MOCK_HTTP_PORT`）                                            |
| WebSocket | 默认与 HTTP 同端口（`MOCK_WS_PORT=0` 或不设）；设 `8766` 等则独立端口 |

也可不设基址，走 Vite `/api` 代理到 `127.0.0.1:8765`。

## 登录

任意非空账号密码。账号 **`admin`**（不区分大小写）返回 `admin: true`，可进管理端 / act-as / 审计。

## 合成进度模拟

启动时已有若干忙碌 CPU（Fluix / 钢锭 / 红石等），存储页置顶行与任务页可见进度填充。

自行提交：打开带左侧绿条的可合成物品 → 预览方案 → 提交。数量为 `1` 也会跑约 **10–20 秒**（按时间推进，与轮询次数无关）。CPU #3/#4 默认可空闲接单；全忙时需等任务结束或在任务页取消。
