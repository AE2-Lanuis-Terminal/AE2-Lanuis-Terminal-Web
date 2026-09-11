# AE2 Lanuis Terminal — Web

**AE2 Lanuis** 的网页界面：在浏览器中登录后操作存储、合成与样板。

也可由 [主模组](https://github.com/Lexcubia/AE2-Lanuis-Terminal) 嵌入服务端页面，或经 [桌面 / Android 客户端](https://github.com/Lexcubia/AE2-Lanuis-Terminal-Client) 使用同一套界面。许可：[MIT](LICENSE)。

## 怎么用

1. 服主已安装主模组，且你已在游戏内用 `/ae2lanuis password …` 绑定网络
2. 在浏览器打开服务器给出的地址（游戏内 `/ae2lanuis status` 可查看）
3. 用游戏账号与绑定密码登录

OP 账号登录后可进入管理端。

使用 **Client** 时：在登录页填写服务器 IP、端口与协议（http/https），再登录。

## 遇到问题

- 打不开网页：确认服务器已放行 HTTP 端口（默认 `8765`），且对外地址配置正确
- 没有物品图标：请服主按主仓 [安装说明 · 图标](https://github.com/Lexcubia/AE2-Lanuis-Terminal/blob/main/docs/INSTALL.md) 烘焙并上传 `aeKeyResources/`
- 更多服主步骤：主仓 [README](https://github.com/Lexcubia/AE2-Lanuis-Terminal) / [INSTALL](https://github.com/Lexcubia/AE2-Lanuis-Terminal/blob/main/docs/INSTALL.md)

## 开发者

本地开发、mock、发版等见 **[docs/README.md](docs/README.md)**。
