package com.vsfit.personal;

import android.util.DisplayMetrics;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * InsetsPlugin — safe-area nativa oficial.
 *
 * Expõe ao JavaScript os valores reais das WindowInsets do Android (status bar,
 * navigation bar, display cutout e gesture insets), convertidos para CSS
 * pixels (dp), via APIs AndroidX oficiais:
 *
 *   - WindowInsetsCompat
 *   - WindowInsetsCompat.Type.systemBars()
 *   - WindowInsetsCompat.Type.displayCutout()
 *   - WindowInsetsCompat.Type.systemGestures()
 *
 * Nenhum valor é estimado por heurística: cada eixo reflecte o maior inset
 * relevante entre as três fontes (systemBars/cutout/gestures), que é exatamente
 * a definição oficial de área segura. Emite o evento "insetsChange" sempre que
 * os insets mudam (rotação, teclado, navegação por gestos, cutout, mudança de
 * configuração). Valores retornados em CSS px (dp), já divididos pela density.
 */
@CapacitorPlugin(name = "Insets")
public class InsetsPlugin extends Plugin {

    @Override
    public void load() {
        super.load();
        View decorView = getActivity().getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decorView, (view, windowInsets) -> {
            JSObject insets = toJsObject(windowInsets);
            notifyListeners("insetsChange", insets, false);
            return windowInsets;
        });
    }

    @PluginMethod
    public void getInsets(PluginCall call) {
        WindowInsetsCompat rootInsets = ViewCompat.getRootWindowInsets(getActivity().getWindow().getDecorView());
        call.resolve(toJsObject(rootInsets));
    }

    private JSObject toJsObject(WindowInsetsCompat windowInsets) {
        JSObject result = new JSObject();
        if (windowInsets == null) {
            result.put("top", 0);
            result.put("bottom", 0);
            result.put("left", 0);
            result.put("right", 0);
            return result;
        }

        Insets systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
        Insets cutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout());
        Insets gestures = windowInsets.getInsets(WindowInsetsCompat.Type.systemGestures());

        float density = getActivity().getResources().getDisplayMetrics().density;

        result.put("top", toDp(Math.max(systemBars.top, cutout.top), density));
        result.put("bottom", toDp(Math.max(systemBars.bottom, gestures.bottom), density));
        result.put("left", toDp(Math.max(systemBars.left, cutout.left), density));
        result.put("right", toDp(Math.max(systemBars.right, cutout.right), density));
        return result;
    }

    private static int toDp(int px, float density) {
        // Converte device pixels -> CSS pixels (dp), a unidade usada pela WebView.
        return Math.round(px / density);
    }
}