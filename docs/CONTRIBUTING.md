# 贡献指南（Web）

- **禁止直推 `main`**，只接受 PR
- 日常 PR：只改 `CHANGELOG.md` 的 `## [Unreleased]`
- **发行 PR**：收入 `## [X.Y.Z]`，bump `package.json` 的 `version`；合入后由 release 流水线打 tag（通网后启用 publish）

本仓 tag 是三仓版本源，发版说明见 [RELEASE.md](RELEASE.md) 与主仓 [RELEASE.md](https://github.com/Lexcubia/AE2-Lanuis-Terminal/blob/main/docs/RELEASE.md)。

开发细节：[DEVELOPMENT.md](DEVELOPMENT.md)。
