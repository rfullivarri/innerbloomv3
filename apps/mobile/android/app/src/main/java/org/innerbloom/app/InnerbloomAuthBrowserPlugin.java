package org.innerbloom.app;

import android.content.Intent;
import android.net.Uri;

import androidx.browser.customtabs.CustomTabsIntent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;

@CapacitorPlugin(name = "InnerbloomAuthBrowser")
public class InnerbloomAuthBrowserPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String urlString = call.getString("url");
        if (urlString == null || urlString.trim().isEmpty()) {
            call.reject("Must provide a valid URL to open", "AUTH_INVALID_URL");
            return;
        }

        Uri uri;
        try {
            uri = Uri.parse(urlString.trim());
        } catch (Exception error) {
            call.reject("Must provide a valid URL to open", "AUTH_INVALID_URL", error);
            return;
        }

        String scheme = uri.getScheme();
        if (scheme == null) {
            call.reject("Authentication URL must use HTTP or HTTPS", "AUTH_INVALID_URL_SCHEME");
            return;
        }

        String normalizedScheme = scheme.toLowerCase(Locale.US);
        if (!"http".equals(normalizedScheme) && !"https".equals(normalizedScheme)) {
            call.reject("Authentication URL must use HTTP or HTTPS", "AUTH_INVALID_URL_SCHEME");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                        .setShowTitle(false)
                        .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
                        // Keep the Clerk browser session available so short-lived native callback
                        // tokens can be refreshed without forcing the user through sign-in again.
                        // Account selection is still forced by the web flow with prompt=select_account.
                        .setSendToExternalDefaultHandlerEnabled(true)
                        .build();

                // The auth tab is a temporary system surface, not the app itself. Launch it from
                // MainActivity so the deep-link callback returns to the existing Capacitor task,
                // and keep the tab out of history so authenticated app routes can never remain
                // visible underneath Chrome's Custom Tab toolbar.
                customTabsIntent.intent.addFlags(Intent.FLAG_ACTIVITY_NO_HISTORY);
                customTabsIntent.launchUrl(getActivity(), uri);

                // Android returns the final callback through Capacitor's appUrlOpen event.
                // Resolving here only confirms that the system authentication surface opened.
                JSObject result = new JSObject();
                result.put("handoff", "appUrlOpen");
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Unable to start authentication session", "AUTH_START_FAILED", error);
            }
        });
    }
}
