from django.contrib import admin
from django.utils.html import format_html
from .models import Scene, FavoriteScene, SceneImage


class SceneImageInline(admin.TabularInline):
    model = SceneImage
    extra = 0
    fields = ('thumbnail_preview', 'caption', 'alt_text', 'order', 'is_primary', 'file_size_human', 'uploaded_at')
    readonly_fields = ('thumbnail_preview', 'file_size_human', 'uploaded_at')
    ordering = ('order',)
    
    def thumbnail_preview(self, obj):
        if obj.thumbnail:
            return format_html(
                '<img src="{}" style="width: 50px; height: 50px; object-fit: cover;" />',
                obj.thumbnail.url
            )
        return "No thumbnail"
    thumbnail_preview.short_description = 'Preview'


@admin.register(Scene)
class SceneAdmin(admin.ModelAdmin):
    list_display = ('title', 'country', 'setting', 'emotion', 'effeminate_age', 'masculine_age', 'favorite_count', 'image_count', 'primary_image_preview')
    search_fields = ('title', 'country', 'setting', 'emotion')
    list_filter = ('country', 'setting', 'emotion')
    inlines = [SceneImageInline]
    
    def image_count(self, obj):
        return obj.scene_images.count()
    image_count.short_description = 'Images'
    
    def primary_image_preview(self, obj):
        primary_image = obj.scene_images.filter(is_primary=True).first()
        if primary_image and primary_image.thumbnail:
            return format_html(
                '<img src="{}" style="width: 40px; height: 40px; object-fit: cover;" />',
                primary_image.thumbnail.url
            )
        return "No primary image"
    primary_image_preview.short_description = 'Primary Image'


@admin.register(SceneImage)
class SceneImageAdmin(admin.ModelAdmin):
    list_display = ('scene', 'caption', 'order', 'is_primary', 'file_size_human', 'dimensions', 'uploaded_at', 'thumbnail_preview')
    list_filter = ('is_primary', 'uploaded_at', 'format')
    search_fields = ('scene__title', 'caption', 'alt_text', 'description')
    readonly_fields = ('uuid', 'file_size', 'width', 'height', 'format', 'uploaded_at', 'updated_at', 'thumbnail_preview', 'image_preview')
    ordering = ('scene', 'order')
    
    fieldsets = (
        ('Image', {
            'fields': ('scene', 'original_image', 'image_preview')
        }),
        ('Metadata', {
            'fields': ('caption', 'alt_text', 'description', 'order', 'is_primary')
        }),
        ('Technical Info', {
            'fields': ('uuid', 'file_size', 'width', 'height', 'format', 'uploaded_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Generated Images', {
            'fields': ('large_image', 'medium_image', 'small_image', 'thumbnail', 'thumbnail_preview'),
            'classes': ('collapse',)
        })
    )
    
    def thumbnail_preview(self, obj):
        if obj.thumbnail:
            return format_html(
                '<img src="{}" style="width: 60px; height: 60px; object-fit: cover;" />',
                obj.thumbnail.url
            )
        return "No thumbnail"
    thumbnail_preview.short_description = 'Thumbnail'
    
    def image_preview(self, obj):
        if obj.medium_image:
            return format_html(
                '<img src="{}" style="max-width: 300px; max-height: 200px;" />',
                obj.medium_image.url
            )
        elif obj.original_image:
            return format_html(
                '<img src="{}" style="max-width: 300px; max-height: 200px;" />',
                obj.original_image.url
            )
        return "No image"
    image_preview.short_description = 'Preview'
    
    def dimensions(self, obj):
        return f"{obj.width}x{obj.height}" if obj.width and obj.height else "Unknown"
    dimensions.short_description = 'Dimensions'


@admin.register(FavoriteScene)
class FavoriteSceneAdmin(admin.ModelAdmin):
    list_display = ('scene', 'session_key', 'created_at')
    search_fields = ('scene__title', 'session_key')
    list_filter = ('created_at',)
    readonly_fields = ('created_at',)
