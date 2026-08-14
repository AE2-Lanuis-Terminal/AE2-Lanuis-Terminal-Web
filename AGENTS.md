# AI Agent / 贡献者指南（Web）

完整说明见 [README.md](README.md) 与 [docs/](docs/README.md)。

- **禁止直推 `main`**；本仓 tag 为三仓版本源 → [docs/RELEASE.md](docs/RELEASE.md)
- 文案走 `src/locales/*`；UI 优先 `@/ui`；平台用 `platform.ts`，勿依赖 `TAURI_*`
- Node ≥ 24；`npm install --legacy-peer-deps`（不提交 lock）；mock 只用 `mock-server/`，勿内嵌
- 类型：`gen:api` 对齐主仓 OpenAPI；细节 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
