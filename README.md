# 喵喵账本 iPhone / iPad 工程

独立 iOS 版本 1.0.4，最低 iOS / iPadOS 15.0。保留猫咪界面、无示例数据、个人消费与公账、独立统计与预算、日期默认当天、CSV 导出。两类账本只在本机保存，不支持多人共享，与 Android、小程序的数据各自独立。

没有 Mac 可以使用工程内附的 GitHub Actions 云编译，流程见 [CLOUD-BUILD.md](CLOUD-BUILD.md)。工程已上传到 https://github.com/xdd283681-gif/meow-ledger-ios ，云编译结果以 GitHub Actions 记录为准。

此文件夹是完整的 Xcode 源码工程。已于 2026-10-30 通过 GitHub 云端 Mac 上的 Xcode 16.4 编译，得到真正的 iPhone 程序，并打包了未签名 IPA。IPA 仍需个人签名后安装，尚未 iPhone 真机验证。源代码 ZIP 不能直接安装到 iPhone。

## 在 Mac 上安装到自己的 iPhone

1. 将整个文件夹复制到安装了 Xcode 的 Mac 上，打开 `MeowLedger.xcodeproj`。
2. 在 Xcode 的设置中登录自己的 Apple 账户。
3. 选中 MeowLedger target → Signing & Capabilities，开启 Automatically manage signing，并选择自己的 Team。
4. 如当前 Bundle Identifier 无法注册，将 `com.meowledger.ios` 修改为自己唯一的标识。
5. 连接 iPhone，选择该设备后点击 Run。设备如有提示，按系统要求开启开发者模式并信任自己的开发者身份。

工程已经包含 `MeowLedger/Web/` 离线资源，不需要 npm、服务器或网络即可由 Xcode 编译。Apple 账户及签名仅在自己的 Mac / Xcode 中配置，不要把密码、私钥发给他人。

Xcode 可以为个人设备创建开发签名；对外发布、TestFlight 或注册设备分发需使用相应的 Apple Developer Program 资格与签名。安装与分发范围由账户资格、证书及描述文件决定。参考 Apple 官方的[签名流程](https://help.apple.com/xcode/mac/current/en.lproj/dev60b6fbbc7.html)和[向已注册设备分发](https://developer.apple.com/documentation/xcode/distributing-your-app-to-registered-devices)。

## 修改与构建

修改 `miniprogram/`、`preview/` 或 `ios/` 后，在安装了 Node.js 的电脑运行：

```sh
npm run prepare:ios
```

这会重新生成 Xcode 使用的 `MeowLedger/Web/`。页面模板与控制器被预打包，运行时无需通过 fetch 读取 file:// 下的文件。WKWebView 仅加载本包文件。

Mac 上可编译无签名模拟器版本：

```sh
bash scripts/build-ios.sh simulator
```

创建签名归档前，先在 Xcode 配置自己的账号、Team 和 Bundle Identifier：

```sh
TEAM_ID=你的10位团队ID bash scripts/build-ios.sh archive
```

然后打开 Xcode Organizer 中的归档，按自己的分发资格选择 Distribute App。是否能导出并安装 IPA 取决于苹果签名与设备配置。脚本不会生成占位 IPA 或伪装成安装包的 ZIP。

## 数据与导出

账本以 JSON 原子写入应用私有 Application Support 目录，文件读写失败会返回错误，不覆盖旧账本。数据目录排除 iCloud 系统备份。应用不接入登录、服务器、统计 SDK 或云同步。

先在顶部选择个人消费或公账，点击「我的 → 导出当前账本」，在 iOS 系统分享面板选择「存储到文件」。CSV 包含账本列，文件名区分 personal 和 public。取消分享不提示成功。清空只影响当前账本；月预算保留。

清除应用数据或卸载会丢失本地账本，请分别导出两个账本。CSV 目前不支持重新导入；原 Android 和小程序的账单不会自动迁移到 iPhone。

## 验证与限制

```sh
npm test
npm install
npx playwright install chromium
npm run prepare:ios
npm run test:ios
```

`tests/ios.cjs` 验证打包目录中的真实 file:// 页面，并模拟 WKWebView 的同步存储响应和导出消息。可通过 `MEOW_CHROME_PATH` 使用已有 Chrome，也可通过 `MEOW_BROWSER=webkit` 测试桌面 WebKit。浏览器测试不能替代 Xcode 编译、iOS 模拟器或 iPhone 真机验证。详细结果见 `release/验证说明.md`。

原小程序与 Android 项目未修改，校验记录在 `original-project-hashes.json`。本目录不包含 Android 签名私钥。
