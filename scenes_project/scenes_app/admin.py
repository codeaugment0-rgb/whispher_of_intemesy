from django.contrib import admin
from .models import Scene, FavoriteScene


@admin.register(Scene)
class SceneAdmin(admin.ModelAdmin):
    list_display = ('title', 'country', 'setting', 'emotion', 'effeminate_age', 'masculine_age', 'favorite_count', 'image_count')
    search_fields = ('title', 'country', 'setting', 'emotion')
    list_filter = ('country', 'setting', 'emotion')
    
    def image_count(self, obj):
        return obj.scene_images.count()
    image_count.short_description = 'Images'


@admin.register(FavoriteScene)
class FavoriteSceneAdmin(admin.ModelAdmin):
    list_display = ('scene', 'session_key', 'created_at')
    search_fields = ('scene__title', 'session_key')
    list_filter = ('created_at',)
    readonly_fields = ('created_at',)
