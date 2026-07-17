import UIKit
import Capacitor

final class InnerbloomBridgeViewController: CAPBridgeViewController {
    private var launchOverlay: UIView?

    override public func viewDidLoad() {
        super.viewDidLoad()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(applicationDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
        presentInnerbloomLaunchOverlay()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    override public func capacitorDidLoad() {
        bridge?.registerPluginInstance(InnerbloomAuthBrowserPlugin())
    }

    @objc private func applicationDidBecomeActive() {
        presentInnerbloomLaunchOverlay()
    }

    private func presentInnerbloomLaunchOverlay() {
        guard launchOverlay == nil, isViewLoaded, view.window != nil else { return }

        let overlay = UIView()
        overlay.translatesAutoresizingMaskIntoConstraints = false
        overlay.backgroundColor = UIColor(red: 5 / 255, green: 7 / 255, blue: 11 / 255, alpha: 1)
        overlay.isUserInteractionEnabled = false

        let logo = UIImageView(image: UIImage(named: "Splash"))
        logo.translatesAutoresizingMaskIntoConstraints = false
        logo.contentMode = .scaleAspectFit

        let wordmark = UILabel()
        wordmark.translatesAutoresizingMaskIntoConstraints = false
        wordmark.textAlignment = .center
        wordmark.numberOfLines = 1
        wordmark.attributedText = NSAttributedString(
            string: "INNERBLOOM",
            attributes: [
                .font: UIFont(name: "AvenirNext-DemiBold", size: 17) ?? UIFont.systemFont(ofSize: 17, weight: .semibold),
                .foregroundColor: UIColor(white: 1, alpha: 0.78),
                .kern: 6.5,
            ]
        )

        let lockup = UIStackView(arrangedSubviews: [logo, wordmark])
        lockup.translatesAutoresizingMaskIntoConstraints = false
        lockup.axis = .vertical
        lockup.alignment = .center
        lockup.spacing = 20

        overlay.addSubview(lockup)
        view.addSubview(overlay)

        NSLayoutConstraint.activate([
            overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlay.topAnchor.constraint(equalTo: view.topAnchor),
            overlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            lockup.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            lockup.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
            logo.widthAnchor.constraint(equalToConstant: 118),
            logo.heightAnchor.constraint(equalToConstant: 118),
        ])

        launchOverlay = overlay

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.25) { [weak self, weak overlay] in
            UIView.animate(withDuration: 0.24, animations: {
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
