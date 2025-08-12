from django.apps import AppConfig


class ScenesAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'scenes_project.scenes_app'

    def ready(self):
        import scenes_project.scenes_app.signals


