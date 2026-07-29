import Capacitor
import Foundation
import UserNotifications

@objc(InnerbloomNotificationsPlugin)
public class InnerbloomNotificationsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InnerbloomNotificationsPlugin"
    public let jsName = "InnerbloomNotifications"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise)
    ]

    @objc func schedule(_ call: CAPPluginCall) {
        guard let notifications = call.getArray("notifications", JSObject.self) else {
            NSLog("[innerbloom-notifications] rejected: missing notifications array")
            call.reject("Must provide notifications array")
            return
        }

        NSLog("[innerbloom-notifications] scheduling %d notification(s)", notifications.count)
        schedule(notifications, at: 0, call: call)
    }

    private func schedule(_ notifications: [JSObject], at index: Int, call: CAPPluginCall) {
        guard index < notifications.count else {
            call.resolve()
            return
        }

        let notification = notifications[index]
        guard let id = notification["id"] as? Int,
              let title = notification["title"] as? String,
              let body = notification["body"] as? String,
              let schedule = notification["schedule"] as? JSObject,
              let atValue = schedule["at"] as? String,
              let date = Self.date(from: atValue) else {
            NSLog("[innerbloom-notifications] rejected: invalid notification payload at index %d: %@", index, notification)
            call.reject("Notification is missing a valid id, title, body, or schedule date")
            return
        }

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.badge = notification["badge"] as? NSNumber
        content.userInfo = [
            "cap_extra": notification["extra"] as? JSObject ?? [:],
            "cap_schedule": ["at": date],
        ]

        if #available(iOS 15.0, *), notification["interruptionLevel"] as? String == "timeSensitive" {
            content.interruptionLevel = .timeSensitive
            content.relevanceScore = notification["relevanceScore"] as? Double ?? 1
        }

        let components = Calendar.current.dateComponents(
            [.calendar, .timeZone, .year, .month, .day, .hour, .minute, .second],
            from: date
        )
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        let request = UNNotificationRequest(identifier: String(id), content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request) { [weak self] error in
            if let error {
                NSLog("[innerbloom-notifications] failed id=%d at=%@ error=%@", id, atValue, error.localizedDescription)
                call.reject(error.localizedDescription, nil, error)
                return
            }
            NSLog("[innerbloom-notifications] scheduled id=%d at=%@", id, atValue)
            self?.schedule(notifications, at: index + 1, call: call)
        }
    }

    private static func date(from value: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: value) ?? ISO8601DateFormatter().date(from: value)
    }
}
