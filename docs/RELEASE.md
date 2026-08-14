# Web 发版

本仓是 **版本源**：发行后打 GitHub tag `vX.Y.Z`，主仓 submodule 与 Client CI 均检出该 tag。

总流程见主仓 [`docs/RELEASE.md`](https://github.com/AE2-Lanuis-Terminal/AE2-Lanuis-Terminal/blob/main/docs/RELEASE.md)。

## 发行 PR 清单

1. 将 `CHANGELOG.md` 的 Unreleased 收入 `## [X.Y.Z] - YYYY-MM-DD`
2. bump `package.json` → `version`
3. 合入 `main`（禁止直推）
4. CI `release.yml`：校验版本；`PUBLISH=false` 时只构建；通网后打 tag + GitHub Release

## 本地

```bash
npm install --legacy-peer-deps
npm run lint
npm run typecheck
npm run build
```
