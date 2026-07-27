package ch.voe.projetswidget;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    public static final String PREFS = "widget_prefs";
    public static final String PREF_USER = "active_user";
    private static final String[] USERS = {"BROYON", "DUPERRET", "HAUTIER", "MERMOUD", "SCHLUCHTER"};

    private Spinner userSpinner;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(24), dp(32), dp(24), dp(24));
        root.setBackgroundColor(Color.rgb(6, 27, 58));
        root.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView icon = new TextView(this);
        icon.setText("⚡");
        icon.setTextSize(42);
        icon.setGravity(Gravity.CENTER);
        root.addView(icon, new LinearLayout.LayoutParams(dp(86), dp(86)));

        TextView title = new TextView(this);
        title.setText("Projets électriques\nWidget Android 4×4");
        title.setTextColor(Color.WHITE);
        title.setTextSize(26);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, dp(10), 0, dp(20));
        root.addView(title, matchWrap());

        TextView label = new TextView(this);
        label.setText("Utilisateur affiché dans le widget");
        label.setTextColor(Color.rgb(190, 202, 220));
        label.setTextSize(14);
        label.setPadding(0, 0, 0, dp(8));
        root.addView(label, matchWrap());

        userSpinner = new Spinner(this);
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, USERS);
        userSpinner.setAdapter(adapter);
        String current = getSharedPreferences(PREFS, MODE_PRIVATE).getString(PREF_USER, "DUPERRET");
        for (int i = 0; i < USERS.length; i++) if (USERS[i].equals(current)) userSpinner.setSelection(i);
        root.addView(userSpinner, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(54)));

        Button save = makeButton("Enregistrer l’utilisateur");
        save.setOnClickListener(v -> {
            saveUser();
            ProjectsWidgetProvider.updateAllWidgets(this);
            Toast.makeText(this, "Utilisateur enregistré", Toast.LENGTH_SHORT).show();
        });
        root.addView(save, buttonParams());

        Button add = makeButton("Ajouter le widget 4×4");
        add.setOnClickListener(v -> {
            saveUser();
            requestWidgetPin();
        });
        root.addView(add, buttonParams());

        TextView note = new TextView(this);
        note.setText("Cette première version affiche le nombre de projets de la base actuellement intégrée au site et fournit des raccourcis vers le tableau de bord. La synchronisation en temps réel avec les données du navigateur sera ajoutée dans une étape suivante.");
        note.setTextColor(Color.rgb(170, 186, 207));
        note.setTextSize(13);
        note.setPadding(0, dp(20), 0, 0);
        root.addView(note, matchWrap());

        setContentView(root);
    }

    private void saveUser() {
        getSharedPreferences(PREFS, MODE_PRIVATE)
                .edit()
                .putString(PREF_USER, String.valueOf(userSpinner.getSelectedItem()))
                .apply();
    }

    private void requestWidgetPin() {
        AppWidgetManager manager = getSystemService(AppWidgetManager.class);
        ComponentName provider = new ComponentName(this, ProjectsWidgetProvider.class);
        if (manager != null && manager.isRequestPinAppWidgetSupported()) {
            manager.requestPinAppWidget(provider, null, null);
        } else {
            Toast.makeText(this, "Maintenez le doigt sur l’écran d’accueil puis choisissez Widgets > Projets électriques.", Toast.LENGTH_LONG).show();
        }
    }

    private Button makeButton(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextColor(Color.rgb(6, 27, 58));
        button.setTextSize(16);
        button.setAllCaps(false);
        button.setBackgroundColor(Color.rgb(255, 193, 7));
        return button;
    }

    private LinearLayout.LayoutParams buttonParams() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(54));
        params.topMargin = dp(14);
        return params;
    }

    private LinearLayout.LayoutParams matchWrap() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
