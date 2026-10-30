# 喵喵账本 iPhone 安装说明

`meow-ledger-1.0.4-unsigned.ipa` 已由 GitHub 云端 Mac 上的 Xcode 16.4 编译，包含真正的 iPhone arm64 程序；目前未签名，不能直接在手机文件管理器中点开安装。

## 没有 Mac 和付费开发者账号

可以在 Windows 上使用 [Sideloadly 官方工具](https://sideloadly.io/) 配合自己的 Apple 账号进行个人签名和安装。该工具支持免费 Apple 账号；免费签名通常有效 7 天，需要续签，具体限制以工具及 Apple 当前规则为准。安装与手机兼容性尚未真机验证。

1. 在 Windows 上按官网说明安装 Sideloadly 及其要求的 Apple 设备驱动。
2. 用数据线连接 iPhone，在手机上确认信任自己的电脑。
3. 将本目录的 `meow-ledger-1.0.4-unsigned.ipa` 放入 Sideloadly，选择自己的 iPhone。
4. 由你本人在工具内输入 Apple 账号、密码和验证码并完成签名安装；不要将密码或验证码发送到聊天。
5. 根据 iPhone 的实际提示，配置自己的开发者应用信任或开发者模式。

这一路线不需要购买 Mac。工具账号登录、证书请求、手机授权和最终安装需由你本人完成。参考 [Sideloadly 官方 FAQ](https://sideloadly.io/faq)。

## 已有苹果开发者签名材料

仓库内已配置 `iOS signed IPA` 工作流，可在自己的 GitHub Actions Secrets 中配置开发或分发证书及描述文件，再导出相应签名 IPA。详见工程中的 CLOUD-BUILD.md。

## 应用内容

无示例账单；个人消费与公账独立保存、统计、预算和 CSV 导出。新建账单日期默认为手机当天。手机数据不自动与 Android、小程序互通。

本地数据仅保存在应用内，卸载或清除应用数据会丢失。更新/续签时保持同一 Apple 账号及应用标识，事前导出账单备份。

云编译记录：https://github.com/xdd283681-gif/meow-ledger-ios/actions/runs/41001068352
