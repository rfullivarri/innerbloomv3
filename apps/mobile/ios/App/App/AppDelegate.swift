import UIKit
import Capacitor

final class InnerbloomBridgeViewController: CAPBridgeViewController {
    private var launchOverlay: UIView?

    override public func viewDidLoad() {
        super.viewDidLoad()
        presentInnerbloomLaunchOverlay()
    }

    override public func capacitorDidLoad() {
        bridge?.registerPluginInstance(InnerbloomAuthBrowserPlugin())
    }

    private func presentInnerbloomLaunchOverlay() {
        guard launchOverlay == nil else { return }
        let overlay = UIView()
        overlay.translatesAutoresizingMaskIntoConstraints = false
        overlay.backgroundColor = UIColor(red: 5 / 255, green: 7 / 255, blue: 11 / 255, alpha: 1)
        overlay.isUserInteractionEnabled = false

        let logo = UIImageView(image: UIImage(named: "Splash"))
        logo.translatesAutoresizingMaskIntoConstraints = false
        logo.contentMode = .scaleAspectFit

        let wordmark = UILabel()
        wordmark.translatesAutoresizingMaskIntoConstraints = false
        wordmark.text = "INNERBLOOM"
        wordmark.textColor = UIColor(white: 1, alpha: 0.92)
        wordmark.font = UIFont.systemFont(ofSize: 21, weight: .semibold)
        wordmark.textAlignment = .center

        overlay.addSubview(logo)
        overlay.addSubview(wordmark)
        view.addSubview(overlay)
        NSLayoutConstraint.activate([
            overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlay.topAnchor.constraint(equalTo: view.topAnchor),
            overlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            logo.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            logo.centerYAnchor.constraint(equalTo: overlay.centerYAnchor, constant: -24),
            logo.widthAnchor.constraint(equalToConstant: 156),
            logo.heightAnchor.constraint(equalTo: logo.widthAnchor),
            wordmark.topAnchor.constraint(equalTo: logo.bottomAnchor, constant: 18),
            wordmark.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
        ])
        launchOverlay = overlay

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.35) { [weak self, weak overlay] in
            UIView.animate(withDuration: 0.28, animations: { overlay?.alpha = 0 }) { _ in
                overlay?.removeFromSuperview()
                self?.launchOverlay = nil
            }
        }
    }
}

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool { true }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
