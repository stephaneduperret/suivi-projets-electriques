package ch.voe.projetswidget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

import java.text.DateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

public class ProjectsWidgetProvider extends AppWidgetProvider {
    private static final String ACTION_REFRESH = "ch.voe.projetswidget.REFRESH";
    private static final String SITE_URL = "https://stephaneduperret.github.io/suivi-projets-electriques/";

    private static final Map<String, Integer> PROJECT_COUNTS = new HashMap<>();
    static {
        PROJECT_COUNTS.put("BROYON", 2);
        PROJECT_COUNTS.put("DUPERRET", 114);
        PROJECT_COUNTS.put("HAUTIER", 6);
        PROJECT_COUNTS.put("MERMOUD", 38);
        PROJECT_COUNTS.put("SCHLUCHTER", 115);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) updateWidget(context, manager, appWidgetId);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_REFRESH.equals(intent.getAction())) updateAllWidgets(context);
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, ProjectsWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        for (int id : ids) updateWidget(context, manager, id);
    }

    private static void updateWidget(Context context, AppWidgetManager manager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(MainActivity.PREFS, Context.MODE_PRIVATE);
        String user = prefs.getString(MainActivity.PREF_USER, "DUPERRET");
        int count = PROJECT_COUNTS.containsKey(user) ? PROJECT_COUNTS.get(user) : 0;

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.projects_widget);
        views.setTextViewText(R.id.widget_user, user);
        views.setTextViewText(R.id.widget_initial, user.substring(0, 1));
        views.setTextViewText(R.id.widget_project_count, String.valueOf(count));
        views.setTextViewText(R.id.widget_updated, "Mis à jour : " + DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(new Date()));

        PendingIntent openSite = browserIntent(context, SITE_URL, 10);
        PendingIntent openGantt = browserIntent(context, SITE_URL + "#gantt", 11);
        PendingIntent openBudgets = browserIntent(context, SITE_URL + "#budgets", 12);
        PendingIntent openProjects = browserIntent(context, SITE_URL + "#projects", 13);

        Intent configIntent = new Intent(context, MainActivity.class);
        PendingIntent config = PendingIntent.getActivity(context, 20, configIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent refreshIntent = new Intent(context, ProjectsWidgetProvider.class);
        refreshIntent.setAction(ACTION_REFRESH);
        PendingIntent refresh = PendingIntent.getBroadcast(context, 21, refreshIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        views.setOnClickPendingIntent(R.id.widget_header, openProjects);
        views.setOnClickPendingIntent(R.id.action_projects, openProjects);
        views.setOnClickPendingIntent(R.id.action_gantt, openGantt);
        views.setOnClickPendingIntent(R.id.action_budgets, openBudgets);
        views.setOnClickPendingIntent(R.id.action_refresh, refresh);
        views.setOnClickPendingIntent(R.id.action_config, config);
        views.setOnClickPendingIntent(R.id.action_open, openSite);

        manager.updateAppWidget(appWidgetId, views);
    }

    private static PendingIntent browserIntent(Context context, String url, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
