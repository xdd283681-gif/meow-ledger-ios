# Windows 用户的苹果云编译流程

本工程已配置两个 GitHub Actions 工作流。远程仓库为 https://github.com/xdd283681-gif/meow-ledger-ios 。首次云编译已成功（运行编号 41001068352），已生成程序并打包未签名 IPA；尚未配置苹果签名或完成真机安装。

## 首次云编译

创建名为 `meow-ledger-ios` 的私有 GitHub 仓库，初始化 README。将此工程推送到该仓库 main 分支（必须保留隐藏的 `.github/workflows` 文件夹）。也可以将仓库地址提供给当前聊天，由助手通过 GitHub 连接器上传。

提交后 `iOS cloud build` 会在 GitHub 的 macOS 15 运行器上执行记账测试、生成离线资源并编译真正的 iPhone 目标。它不需要苹果签名。完成后在 Actions → 本次运行 → Artifacts 下载编译结果。

`MeowLedger-unsigned-app.zip` 是已编译的 iPhone 程序。工作流也会打包 `meow-ledger-1.0.4-unsigned.ipa`，该 IPA 尚未签名；可由用户在 Windows 上使用 Sideloadly 等工具及自己的 Apple 账号完成个人签名与安装，或使用下方配置好的签名工作流。免费个人签名通常需要每 7 天续签，详见 https://sideloadly.io/faq 。

## 签名 IPA

在 GitHub 仓库 Settings → Secrets and variables → Actions 添加以下 Secrets。不要把证书、密码或私钥提交进代码，也无需将密码发到聊天。

| Secret | 内容 |
|---|---|
| IOS_CERTIFICATE_BASE64 | 苹果开发或分发证书的 .p12 文件（需含私钥），以 Base64 编码 |
| IOS_CERTIFICATE_PASSWORD | 该 .p12 文件的密码 |
| IOS_PROFILE_BASE64 | 对应的 .mobileprovision 文件，以 Base64 编码 |

然后在 Actions 选择 `iOS signed IPA` → Run workflow，填写与描述文件匹配的 Bundle ID，选择签名类型：

- debugging：开发签名，描述文件需包含目标 iPhone。
- release-testing：Ad Hoc 测试分发，描述文件需包含目标 iPhone。
- app-store-connect：提交 App Store Connect / TestFlight 的分发包，需后续上传及苹果处理，不能直接作为通用安装包分发。

工作流会验证描述文件的有效期、Bundle ID、团队标识及分发类型，导入临时钥匙串，归档并导出签名 IPA。完成后从 `MeowLedger-signed-IPA` Artifact 下载。临时证书和描述文件在作业退出时清理。云编译是否需要费用取决于自己的 GitHub 账户额度；本配置未购买任何服务。

苹果开发者证书、私钥和描述文件必须由自己的苹果开发者身份合法取得；连接普通 GitHub 账户不会自动提供苹果签名。

参考：[GitHub 的苹果签名配置](https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/sign-xcode-applications)。

本地配置检查：`bash -n scripts/cloud-sign-ios.sh` 和 `python tests/signing_test.py`。额外的 YAML 检查脚本 `scripts/check-cloud.py` 需要先安装 `scripts/validation-requirements.txt` 中的 PyYAML；云编译工作流本身不依赖该库。
