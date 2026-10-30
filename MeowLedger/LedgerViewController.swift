import UIKit
import WebKit

private final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(userContentController, didReceive: message)
    }
}

final class LedgerViewController: UIViewController, WKUIDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    private var web: WKWebView!
    private var webRoot: URL!
    private var exporting = false
    private let storageKey = "meow-ledger-v1"
    override var preferredStatusBarStyle: UIStatusBarStyle { .darkContent }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 250/255.0, green: 249/255.0, blue: 245/255.0, alpha: 1)
        guard let root = Bundle.main.url(forResource: "Web", withExtension: nil) else {
            let label = UILabel(frame: view.bounds)
            label.text = "应用资源缺失，请重新安装。"
            label.textAlignment = .center
            view.addSubview(label)
            return
        }
        webRoot = root.standardizedFileURL
        let config = WKWebViewConfiguration()
        config.userContentController.add(WeakMessageHandler(self), name: "meow")
        web = WKWebView(frame: .zero, configuration: config)
        web.uiDelegate = self
        web.navigationDelegate = self
        web.isOpaque = false
        web.backgroundColor = view.backgroundColor
        web.scrollView.backgroundColor = view.backgroundColor
        web.scrollView.isScrollEnabled = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(web)
        NSLayoutConstraint.activate([
            web.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            web.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor)
        ])
        web.loadFileURL(root.appendingPathComponent("ios/index.html"), allowingReadAccessTo: root)
    }

    private func trusted(_ frame: WKFrameInfo) -> Bool {
        guard frame.isMainFrame, let url = frame.request.url, url.isFileURL, let root = webRoot else { return false }
        return url.standardizedFileURL.path.hasPrefix(root.path + "/")
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url, url.isFileURL,
              url.standardizedFileURL == webRoot.appendingPathComponent("ios/index.html").standardizedFileURL else {
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    private func ledgerFile() throws -> URL {
        let fm = FileManager.default
        var directory = try fm.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true).appendingPathComponent("MeowLedger", isDirectory: true)
        try fm.createDirectory(at: directory, withIntermediateDirectories: true)
        var attributes = URLResourceValues()
        attributes.isExcludedFromBackup = true
        try directory.setResourceValues(attributes)
        return directory.appendingPathComponent("ledger.json")
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        guard trusted(frame), prompt.hasPrefix("meow-storage:") else { completionHandler(nil); return }
        var reply: [String: Any]
        do {
            guard let data = String(prompt.dropFirst("meow-storage:".count)).data(using: .utf8),
                  let request = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  request["key"] as? String == storageKey else { throw LedgerError.invalidRequest }
            let file = try ledgerFile()
            switch request["action"] as? String {
            case "get":
                let value: String
                if FileManager.default.fileExists(atPath: file.path) { value = try String(contentsOf: file, encoding: .utf8) }
                else { value = "" }
                reply = ["ok": true, "value": value]
            case "set":
                guard let value = request["value"] as? String, let bytes = value.data(using: .utf8) else { throw LedgerError.invalidRequest }
                _ = try JSONSerialization.jsonObject(with: bytes)
                try bytes.write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
                reply = ["ok": true, "value": true]
            default: throw LedgerError.invalidRequest
            }
        } catch {
            reply = ["ok": false, "error": "无法读写账本，请检查设备存储空间后重试"]
        }
        let bytes = try? JSONSerialization.data(withJSONObject: reply)
        completionHandler(bytes.flatMap { String(data: $0, encoding: .utf8) })
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard trusted(message.frameInfo), let request = message.body as? [String: Any] else { return }
        switch request["action"] as? String {
        case "hideKeyboard": view.endEditing(true)
        case "exportCsv":
            guard let filename = request["filename"] as? String, let csv = request["csv"] as? String else { return }
            export(filename: filename, csv: csv)
        default: break
        }
    }

    private func export(filename: String, csv: String) {
        guard !exporting, presentedViewController == nil else { notify("请先完成当前文件导出"); return }
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        do {
            guard filename.range(of: "^meow-ledger-(personal|public)-[0-9-]+\\.csv$", options: .regularExpression) != nil else { throw LedgerError.invalidRequest }
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let file = directory.appendingPathComponent(filename)
            try Data(csv.utf8).write(to: file, options: .atomic)
            let sheet = UIActivityViewController(activityItems: [file], applicationActivities: nil)
            sheet.popoverPresentationController?.sourceView = view
            sheet.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
            sheet.completionWithItemsHandler = { [weak self] _, completed, _, error in
                try? FileManager.default.removeItem(at: directory)
                self?.exporting = false
                if error != nil { self?.notify("导出失败，请重试") }
                else if completed { self?.notify("账单已导出，喵～") }
            }
            exporting = true
            present(sheet, animated: true)
        } catch {
            try? FileManager.default.removeItem(at: directory)
            notify("导出失败，请检查存储空间")
        }
    }

    private func notify(_ message: String) {
        guard let bytes = try? JSONSerialization.data(withJSONObject: [message]), let json = String(data: bytes, encoding: .utf8) else { return }
        web.evaluateJavaScript("window.__meowExportResult && window.__meowExportResult(\(json)[0])", completionHandler: nil)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.loadFileURL(webRoot.appendingPathComponent("ios/index.html"), allowingReadAccessTo: webRoot)
    }
    private enum LedgerError: Error { case invalidRequest }
}
