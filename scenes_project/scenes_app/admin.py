from django.contrib import admin
from .models import Scene, FavoriteScene #SceneImage


# class SceneImageInline(admin.TabularInline):
#     model = SceneImage
#     extra = 0
#     fields = ('image', 'thumbnail', 'caption', 'order', 'file_size_human', 'width', 'height')
#     readonly_fields = ('thumbnail', 'file_size_human', 'width', 'height')


@admin.register(Scene)
class SceneAdmin(admin.ModelAdmin):
    list_display = ('title', 'country', 'setting', 'emotion', 'effeminate_age', 'masculine_age', 'favorite_count', 'image_count')
    search_fields = ('title', 'country', 'setting', 'emotion')
    list_filter = ('country', 'setting', 'emotion')
    # inlines = [SceneImageInline]
    
    def image_count(self, obj):
        return obj.scene_images.count()
    image_count.short_description = 'Images'


@admin.register(FavoriteScene)
class FavoriteSceneAdmin(admin.ModelAdmin):
    list_display = ('scene', 'session_key', 'created_at')
    search_fields = ('scene__title', 'session_key')
    list_filter = ('created_at',)
    readonly_fields = ('created_at',)


# @admin.register(SceneImage)
# class SceneImageAdmin(admin.ModelAdmin):
#     list_display = ('scene', 'caption', 'order', 'file_size_human', 'width', 'height', 'uploaded_at')
#     search_fields = ('scene__title', 'caption')
#     list_filter = ('uploaded_at',)
#     readonly_fields = ('thumbnail', 'file_size_human', 'width', 'height', 'uploaded_at')
#     ordering = ('scene', 'order')


