from django.urls import path
from . import views


urlpatterns = [
    path('', views.scene_list, name='scene_list'),
    path('search/', views.search_results, name='search_results'),
    path('scene/<int:pk>/', views.scene_detail, name='scene_detail'),
    path('random/', views.random_scene, name='random_scene'),
    path('favorites/', views.favorites_list, name='favorites_list'),
    path('scene/<int:pk>/toggle-favorite/', views.toggle_favorite, name='toggle_favorite'),
    path('api/scene/<int:pk>/prompt/', views.ScenePromptAPIView.as_view(), name='scene_prompt_api'),
    path('api/random/', views.RandomSceneAPIView.as_view(), name='random_scene_api'),
    path('api/pagination/', views.pagination_api, name='pagination_api'),
    path('api/search/suggestions/', views.search_suggestions_api, name='search_suggestions_api'),
    path('api/search/', views.search_api, name='search_api'),
    path('add_scene/', views.add_scene, name='add_scene'),
    path('scene/<int:pk>/edit/', views.edit_scene, name='edit_scene'),
    path('scene/<int:pk>/delete/', views.delete_scene, name='delete_scene'),
    path('api/scene/<int:pk>/update/', views.update_scene_api, name='update_scene_api'),
    path('api/scene/<int:pk>/delete/', views.delete_scene_api, name='delete_scene_api'),
    path('analytics/', views.analytics, name='analytics'),
    path('api/analytics/', views.analytics_api, name='analytics_api'),
    path('api/debug/', views.debug_api, name='debug_api'),
    
    # Image management URLs
    path('scene/<int:pk>/gallery/', views.scene_gallery, name='scene_gallery'),
    path('api/scene/<int:pk>/images/', views.scene_images_api, name='scene_images_api'),
    path('api/scene/<int:pk>/upload-images/', views.upload_scene_images, name='upload_scene_images'),
    path('api/scene/<int:pk>/update-image-order/', views.update_image_order, name='update_image_order'),
    path('api/image/<int:image_id>/update/', views.update_image_metadata, name='update_image_metadata'),
    path('api/image/<int:image_id>/delete/', views.delete_scene_image, name='delete_scene_image'),
]
