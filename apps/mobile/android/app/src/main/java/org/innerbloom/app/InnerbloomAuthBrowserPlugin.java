package org.innerbloom.app;

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
                        .setEphemeralBrowsingEnabled(true)
                        .setSendToExternalDefaultHandlerEnabled(true)
                        .build();
                customTabsIntent.launchUrl(getContext(), uri);

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
