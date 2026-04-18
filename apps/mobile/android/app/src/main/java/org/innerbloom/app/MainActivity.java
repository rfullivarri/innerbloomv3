package org.innerbloom.app;

import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        View content = findViewById(R.id.main_content);
        if (content == null) {
            ViewGroup root = findViewById(android.R.id.content);
            content = root != null && root.getChildCount() > 0 ? root.getChildAt(0) : null;
        }

        if (content == null) {
            return;
        }

        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            Insets systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            Insets displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout());

            view.setPadding(
                    Math.max(systemBars.left, displayCutout.left),
                    0,
                    Math.max(systemBars.right, displayCutout.right),
                    systemBars.bottom
            );

            return windowInsets;
        });
        ViewCompat.requestApplyInsets(content);
    }
}
