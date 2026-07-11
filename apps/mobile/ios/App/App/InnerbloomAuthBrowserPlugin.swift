import AuthenticationServices
import Capacitor
import UIKit

@objc(InnerbloomAuthBrowserPlugin)
public class InnerbloomAuthBrowserPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "InnerbloomAuthBrowserPlugin"
    public let jsName = "InnerbloomAuthBrowser"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise)
    ]

    private var activeSession: ASWebAuthenticationSession?
    private var activeCall: CAPPluginCall?

    @objc func open(_ call: CAPPluginCall) {
        guard activeCall == nil else {
            call.reject("An authentication session is already active", "AUTH_SESSION_ACTIVE")
            return
        }

        guard let urlString = call.getString("url"), let url = URL(string: urlString) else {
            call.reject("Must provide a valid URL to open", "AUTH_INVALID_URL")
            return
        }

        guard let scheme = url.scheme?.lowercased(), ["http", "https"].contains(scheme) else {
            call.reject("Authentication URL must use HTTP or HTTPS", "AUTH_INVALID_URL_SCHEME")
            return
        }

        let callbackScheme = call.getString("callbackScheme") ?? "innerbloom"
        let prefersEphemeralSession = call.getBool("prefersEphemeralWebBrowserSession", false)

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }

            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: callbackScheme) { [weak self] callbackURL, error in
                guard let self else { return }
                let pendingCall = self.activeCall
                self.activeCall = nil
                self.activeSession = nil

                if let callbackURL {
                    pendingCall?.resolve(["url": callbackURL.absoluteString])
                    return
                }

                if let authError = error as? ASWebAuthenticationSessionError, authError.code == .canceledLogin {
                    pendingCall?.reject("Authentication session was cancelled", "AUTH_CANCELLED", authError)
                    return
                }

                pendingCall?.reject(error?.localizedDescription ?? "Authentication session failed", "AUTH_FAILED", error)
            }

            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = prefersEphemeralSession

            self.activeCall = call
            self.activeSession = session

            if !session.start() {
                self.activeCall = nil
                self.activeSession = nil
                call.reject("Unable to start authentication session", "AUTH_START_FAILED")
            }
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        if let window = bridge?.viewController?.view.window {
            return window
        }

        return UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}
