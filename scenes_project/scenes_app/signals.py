from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Scene, SearchSuggestion, SceneImage
import re
from collections import Counter
import logging
import os
from django.conf import settings

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Scene)
def update_search_suggestions_on_scene_save(sender, instance, created, **kwargs):
    """Update search suggestions when a scene is created or updated"""
    try:
        # Add/update suggestions for this specific scene
        _train_suggestions_for_scene(instance)
        logger.info(f"Updated search suggestions for scene: {instance.title}")
    except Exception as e:
        logger.error(f"Failed to update search suggestions for scene {instance.id}: {str(e)}")


@receiver(post_delete, sender=Scene)
def cleanup_scene_images_on_delete(sender, instance, **kwargs):
    """Clean up scene images and folders when a scene is deleted"""
    try:
        # Delete all associated images (this will trigger SceneImage.delete() which cleans up files)
        for image in instance.scene_images.all():
            image.delete()
        
        # Clean up the scene's image folder if it exists and is empty
        folder_path = os.path.join(settings.MEDIA_ROOT, instance.image_folder_path)
        if os.path.exists(folder_path):
            try:
                # Remove folder if it's empty
                os.rmdir(folder_path)
                logger.info(f"Removed empty image folder: {folder_path}")
            except OSError:
                # Folder not empty or other error - that's okay
                pass
        
        logger.info(f"Scene deleted: {instance.title}. Image cleanup completed.")
    except Exception as e:
        logger.error(f"Error during scene deletion cleanup: {str(e)}")


@receiver(post_delete, sender=SceneImage)
def cleanup_image_files_on_delete(sender, instance, **kwargs):
    """Clean up image files when a SceneImage is deleted"""
    try:
        # Delete all image files
        for field_name in ['original_image', 'large_image', 'medium_image', 'small_image', 'thumbnail']:
            field = getattr(instance, field_name)
            if field:
                try:
                    if field.storage.exists(field.name):
                        field.storage.delete(field.name)
                        logger.info(f"Deleted image file: {field.name}")
                except Exception as e:
                    logger.error(f"Error deleting {field_name}: {str(e)}")
        
        logger.info(f"Image cleanup completed for SceneImage {instance.id}")
    except Exception as e:
        logger.error(f"Error during image file cleanup: {str(e)}")


def _train_suggestions_for_scene(scene):
    """Train suggestions for a single scene with improved efficiency"""
    from collections import Counter

    # Common words to exclude
    common_words = {
        'the', 'and', 'with', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'men', 'she', 'use', 'way', 'that', 'this', 'have', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were', 'what', 'will', 'would', 'there', 'could', 'other'
    }

    # Process title with higher weight
    if scene.title:
        title_clean = scene.title.strip()
        SearchSuggestion.add_or_update_suggestion(title_clean, 'title')

        # Extract meaningful title words
        title_words = re.findall(r'\b[a-zA-Z]{3,}\b', title_clean.lower())
        for word in title_words:
            if word not in common_words:
                SearchSuggestion.add_or_update_suggestion(word, 'title')

    # Process basic fields
    if scene.country:
        SearchSuggestion.add_or_update_suggestion(scene.country, 'country')
    if scene.setting:
        SearchSuggestion.add_or_update_suggestion(scene.setting, 'setting')
    if scene.emotion:
        SearchSuggestion.add_or_update_suggestion(scene.emotion, 'emotion')

    # Process character details efficiently
    if scene.details:
        for character_type in ['effeminate', 'masculine']:
            character_data = scene.details.get(character_type, {})
            for field in ['appearance', 'hair', 'clothing']:
                value = character_data.get(field, '')
                if value and len(value.strip()) > 2:
                    words = re.findall(r'\b[a-zA-Z]{3,}\b', value.lower())
                    for word in words:
                        if word not in common_words and len(word) >= 3:
                            SearchSuggestion.add_or_update_suggestion(word, 'character')

        # Process atmosphere details
        atmosphere = scene.details.get('atmosphere', {})
        for field in ['lighting', 'scent', 'sound']:
            value = atmosphere.get(field, '')
            if value and len(value.strip()) > 2:
                words = re.findall(r'\b[a-zA-Z]{4,}\b', value.lower())
                for word in words:
                    if word not in common_words:
                        SearchSuggestion.add_or_update_suggestion(word, 'content')

    # Process full_text more efficiently
    if scene.full_text and len(scene.full_text.strip()) > 10:
        # Extract meaningful content words (4+ characters)
        content_words = re.findall(r'\b[a-zA-Z]{4,}\b', scene.full_text.lower())

        # Filter out common words
        filtered_words = [word for word in content_words if word not in common_words]

        # Get word counts and only process significant words
        word_counts = Counter(filtered_words)
        for word, count in word_counts.most_common(15):  # Reduced from 20 to 15
            if count >= 2 or len(word) >= 6:  # Only frequent or long words
                suggestion = SearchSuggestion.add_or_update_suggestion(word, 'content')
                if suggestion and count > 1:
                    # Boost frequency for repeated words (but cap it)
                    boost = min(count - 1, 3)  # Cap boost at 3
                    suggestion.frequency += boost
                    suggestion.save(update_fields=['frequency'])


def cleanup_unused_suggestions():
    """
    Clean up suggestions that are no longer relevant.
    This should be run periodically (e.g., via a cron job or management command).
    """
    try:
        # Get all unique terms from current scenes
        current_terms = set()
        
        for scene in Scene.objects.all():
            # Title words
            title_words = re.findall(r'\b\w{3,}\b', scene.title.lower())
            current_terms.update(title_words)
            current_terms.add(scene.title.lower())
            
            # Basic fields
            current_terms.add(scene.country.lower())
            current_terms.add(scene.setting.lower())
            current_terms.add(scene.emotion.lower())
            
            # Character and content details
            if scene.details:
                for character_type in ['effeminate', 'masculine']:
                    character_data = scene.details.get(character_type, {})
                    for field in ['appearance', 'hair', 'clothing']:
                        value = character_data.get(field, '')
                        if value:
                            words = re.findall(r'\b\w{3,}\b', value.lower())
                            current_terms.update(words)
                
                atmosphere = scene.details.get('atmosphere', {})
                for field in ['lighting', 'scent', 'sound']:
                    value = atmosphere.get(field, '')
                    if value:
                        words = re.findall(r'\b\w{3,}\b', value.lower())
                        current_terms.update(words)
            
            if scene.full_text:
                content_words = re.findall(r'\b\w{4,}\b', scene.full_text.lower())
                current_terms.update(content_words)
        
        # Remove suggestions that are no longer in any scene
        obsolete_suggestions = SearchSuggestion.objects.exclude(term__in=current_terms)
        count = obsolete_suggestions.count()
        obsolete_suggestions.delete()
        
        logger.info(f"Cleaned up {count} obsolete search suggestions")
        return count
        
    except Exception as e:
        logger.error(f"Failed to cleanup unused suggestions: {str(e)}")
        return 0
