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

        let glow = UIView()
        glow.translatesAutoresizingMaskIntoConstraints = false
        glow.backgroundColor = UIColor(red: 132 / 255, green: 92 / 255, blue: 246 / 255, alpha: 0.14)
        glow.layer.cornerRadius = 150
        glow.layer.shadowColor = UIColor(red: 132 / 255, green: 92 / 255, blue: 246 / 255, alpha: 1).cgColor
        glow.layer.shadowOpacity = 0.36
        glow.layer.shadowRadius = 72
        glow.layer.shadowOffset = .zero

        let logo = UIImageView(image: UIImage(named: "Splash"))
        logo.translatesAutoresizingMaskIntoConstraints = false
        logo.contentMode = .scaleAspectFit

        overlay.addSubview(glow)
        overlay.addSubview(logo)
        view.addSubview(overlay)

        NSLayoutConstraint.activate([
            overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlay.topAnchor.constraint(equalTo: view.topAnchor),
            overlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            glow.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            glow.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
            glow.widthAnchor.constraint(equalToConstant: 300),
            glow.heightAnchor.constraint(equalTo: glow.widthAnchor),

            logo.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            logo.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
            logo.widthAnchor.constraint(lessThanOrEqualTo: overlay.widthAnchor, multiplier: 0.58),
            logo.heightAnchor.constraint(lessThanOrEqualToConstant: 260),
        ])

        launchOverlay = overlay

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.35) { [weak self, weak overlay] in
            UIView.animate(withDuration: 0.28, animations: {
                overlay?.alpha = 0
            }, completion: { _ in
                overlay?.removeFromSuperview()
                self?.launchOverlay = nil
            })
        }
    }
}

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
