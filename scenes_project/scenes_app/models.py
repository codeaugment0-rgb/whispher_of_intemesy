from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.core.files.storage import default_storage
from django.conf import settings
import re
import os
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile


class Scene(models.Model):
    title = models.CharField(max_length=255, unique=True)
    effeminate_age = models.IntegerField()
    masculine_age = models.IntegerField()
    country = models.CharField(max_length=100)
    setting = models.CharField(max_length=100)
    emotion = models.CharField(max_length=100)
    details = models.JSONField(default=dict)
    full_text = models.TextField()

    class Meta:
        ordering = ['id']
        indexes = [
            models.Index(fields=['country']),
            models.Index(fields=['setting']),
            models.Index(fields=['emotion']),
        ]

    def __str__(self) -> str:
        return self.title

    @property
    def favorite_count(self):
        return self.favorites.count()
    
    @property
    def image_folder_path(self):
        """Get the folder path for this scene's images"""
        # Clean the title for use as folder name
        clean_title = re.sub(r'[^\w\s-]', '', self.title).strip()
        clean_title = re.sub(r'[-\s]+', '-', clean_title)
        return f"scene_images/{clean_title}_{self.id}"
    
    @property
    def images(self):
        """Get all images for this scene"""
        return self.scene_images.all().order_by('order', 'uploaded_at')


def scene_image_upload_path(instance, filename):
    """Generate upload path for scene images"""
    # Clean filename
    name, ext = os.path.splitext(filename)
    clean_name = re.sub(r'[^\w\s-]', '', name).strip()
    clean_name = re.sub(r'[-\s]+', '-', clean_name)
    clean_filename = f"{clean_name}{ext.lower()}"
    
    return f"{instance.scene.image_folder_path}/{clean_filename}"


class SceneImage(models.Model):
    scene = models.ForeignKey(Scene, on_delete=models.CASCADE, related_name='scene_images')
    image = models.ImageField(upload_to=scene_image_upload_path)
    thumbnail = models.ImageField(upload_to=scene_image_upload_path, blank=True, null=True)
    caption = models.CharField(max_length=255, blank=True)
    order = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file_size = models.PositiveIntegerField(default=0)  # Size in bytes
    width = models.PositiveIntegerField(default=0)
    height = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'uploaded_at']
        indexes = [
            models.Index(fields=['scene', 'order']),
        ]

    def __str__(self):
        return f"Image for {self.scene.title} - {self.image.name}"

    def save(self, *args, **kwargs):
        if self.image and not self.thumbnail:
            self.create_thumbnail()
        
        # Get image dimensions and file size
        if self.image:
            try:
                with Image.open(self.image) as img:
                    self.width, self.height = img.size
                self.file_size = self.image.size
            except Exception:
                pass
        
        super().save(*args, **kwargs)

    def create_thumbnail(self):
        """Create a thumbnail for the image"""
        if not self.image:
            return

        try:
            with Image.open(self.image) as image:
                # Convert to RGB if necessary
                if image.mode in ('RGBA', 'LA', 'P'):
                    image = image.convert('RGB')
                
                # Create thumbnail
                image.thumbnail((300, 300), Image.Resampling.LANCZOS)
                
                # Save thumbnail
                thumb_io = BytesIO()
                image.save(thumb_io, format='JPEG', quality=85, optimize=True)
                thumb_io.seek(0)
                
                # Generate thumbnail filename
                name, ext = os.path.splitext(self.image.name)
                thumb_name = f"{name}_thumb.jpg"
                
                self.thumbnail.save(
                    thumb_name,
                    ContentFile(thumb_io.read()),
                    save=False
                )
        except Exception as e:
            print(f"Error creating thumbnail: {e}")

    def delete(self, *args, **kwargs):
        """Delete image files when model is deleted"""
        if self.image:
            default_storage.delete(self.image.name)
        if self.thumbnail:
            default_storage.delete(self.thumbnail.name)
        super().delete(*args, **kwargs)

    @property
    def file_size_human(self):
        """Return human readable file size"""
        if self.file_size < 1024:
            return f"{self.file_size} B"
        elif self.file_size < 1024 * 1024:
            return f"{self.file_size / 1024:.1f} KB"
        else:
            return f"{self.file_size / (1024 * 1024):.1f} MB"


class FavoriteScene(models.Model):
    scene = models.ForeignKey(Scene, on_delete=models.CASCADE, related_name='favorites')
    session_key = models.CharField(max_length=40)  # Using session for anonymous users
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('scene', 'session_key')
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"Favorite: {self.scene.title} (Session: {self.session_key[:8]}...)"


class SearchSuggestion(models.Model):
    """Model to store search suggestions that auto-trains on scene data"""
    SUGGESTION_TYPES = [
        ('title', 'Title'),
        ('country', 'Country'),
        ('setting', 'Setting'),
        ('emotion', 'Emotion'),
        ('content', 'Content'),
        ('character', 'Character'),
    ]

    term = models.CharField(max_length=255, db_index=True)
    suggestion_type = models.CharField(max_length=20, choices=SUGGESTION_TYPES, db_index=True)
    frequency = models.PositiveIntegerField(default=1)
    last_used = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('term', 'suggestion_type')
        ordering = ['-frequency', '-last_used']
        indexes = [
            models.Index(fields=['term', 'suggestion_type']),
            models.Index(fields=['frequency', 'last_used']),
        ]

    def __str__(self):
        return f"{self.term} ({self.suggestion_type}) - {self.frequency} uses"

    @classmethod
    def get_suggestions(cls, query, suggestion_type=None, limit=10):
        """Get suggestions based on query and type"""
        if not query:
            return cls.objects.none()

        # Clean and prepare query
        query = query.strip().lower()
        if len(query) < 2:
            return cls.objects.none()

        # Build filter
        filters = Q(term__icontains=query)
        if suggestion_type:
            filters &= Q(suggestion_type=suggestion_type)

        return cls.objects.filter(filters).order_by('-frequency', '-last_used')[:limit]

    @classmethod
    def add_or_update_suggestion(cls, term, suggestion_type):
        """Add new suggestion or update existing one"""
        if not term or len(term.strip()) < 2:
            return None

        term = term.strip().lower()
        suggestion, created = cls.objects.get_or_create(
            term=term,
            suggestion_type=suggestion_type,
            defaults={'frequency': 1}
        )

        if not created:
            suggestion.frequency += 1
            suggestion.last_used = timezone.now()
            suggestion.save(update_fields=['frequency', 'last_used'])

        return suggestion

    @classmethod
    def train_from_scenes(cls, batch_size=100):
        """Auto-train suggestions from existing scene data with improved performance"""
        from collections import Counter, defaultdict
        import time

        print("Starting enhanced training...")
        start_time = time.time()

        # Use bulk operations for better performance
        scenes = Scene.objects.all()
        total_scenes = scenes.count()

        if total_scenes == 0:
            print("No scenes found for training.")
            return

        # Collect all suggestions in memory first
        suggestions_data = defaultdict(lambda: defaultdict(int))

        print(f"Processing {total_scenes} scenes...")

        for i, scene in enumerate(scenes.iterator(chunk_size=batch_size)):
            if i % 100 == 0:
                print(f"Processed {i}/{total_scenes} scenes...")

            # Process title - both full title and individual words
            if scene.title:
                title_clean = scene.title.strip()
                suggestions_data[title_clean.lower()]['title'] += 2  # Full titles get higher weight

                # Extract meaningful title words (3+ chars, exclude common words)
                title_words = re.findall(r'\b[a-zA-Z]{3,}\b', title_clean.lower())
                for word in title_words:
                    if word not in ['the', 'and', 'with', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'men', 'she', 'use', 'way', 'who']:
                        suggestions_data[word]['title'] += 1

            # Process basic fields with higher weights
            if scene.country:
                suggestions_data[scene.country.lower()]['country'] += 3
            if scene.setting:
                suggestions_data[scene.setting.lower()]['setting'] += 3
            if scene.emotion:
                suggestions_data[scene.emotion.lower()]['emotion'] += 3

            # Process character details
            if scene.details:
                for character_type in ['effeminate', 'masculine']:
                    character_data = scene.details.get(character_type, {})
                    for field in ['appearance', 'hair', 'clothing']:
                        value = character_data.get(field, '')
                        if value and len(value.strip()) > 2:
                            # Extract meaningful phrases and words
                            words = re.findall(r'\b[a-zA-Z]{3,}\b', value.lower())
                            for word in words:
                                if word not in ['the', 'and', 'with', 'very', 'that', 'this', 'have', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'will', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were']:
                                    suggestions_data[word]['character'] += 1

                # Process atmosphere details
                atmosphere = scene.details.get('atmosphere', {})
                for field in ['lighting', 'scent', 'sound']:
                    value = atmosphere.get(field, '')
                    if value and len(value.strip()) > 2:
                        words = re.findall(r'\b[a-zA-Z]{3,}\b', value.lower())
                        for word in words:
                            if len(word) >= 4:  # Longer words for atmosphere
                                suggestions_data[word]['content'] += 1

            # Process full_text with smart extraction
            if scene.full_text and len(scene.full_text.strip()) > 10:
                # Extract meaningful content words (4+ characters)
                content_words = re.findall(r'\b[a-zA-Z]{4,}\b', scene.full_text.lower())

                # Filter out common words and get word counts
                filtered_words = [word for word in content_words if word not in [
                    'that', 'with', 'have', 'this', 'will', 'your', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were', 'what', 'would', 'there', 'could', 'other', 'after', 'first', 'never', 'these', 'think', 'where', 'being', 'every', 'great', 'might', 'shall', 'still', 'those', 'under', 'while', 'should', 'through', 'before', 'around', 'between', 'during', 'without', 'against', 'nothing', 'someone', 'something', 'everything', 'anything', 'everyone', 'anyone'
                ]]

                word_counts = Counter(filtered_words)
                # Only take top words that appear multiple times or are longer
                for word, count in word_counts.most_common(30):
                    if count >= 2 or len(word) >= 6:  # Prioritize repeated or longer words
                        suggestions_data[word]['content'] += min(count, 5)  # Cap frequency boost

        print(f"Collected {len(suggestions_data)} unique terms. Creating database entries...")

        # Bulk create/update suggestions
        suggestions_to_create = []
        suggestions_to_update = []

        # Get existing suggestions
        existing_suggestions = {}
        for suggestion in cls.objects.all():
            key = (suggestion.term, suggestion.suggestion_type)
            existing_suggestions[key] = suggestion

        for term, type_counts in suggestions_data.items():
            if len(term.strip()) < 2:
                continue

            for suggestion_type, frequency in type_counts.items():
                key = (term, suggestion_type)

                if key in existing_suggestions:
                    # Update existing
                    suggestion = existing_suggestions[key]
                    suggestion.frequency += frequency
                    suggestions_to_update.append(suggestion)
                else:
                    # Create new
                    suggestions_to_create.append(cls(
                        term=term,
                        suggestion_type=suggestion_type,
                        frequency=frequency
                    ))

        # Bulk operations
        if suggestions_to_create:
            cls.objects.bulk_create(suggestions_to_create, batch_size=batch_size)
            print(f"Created {len(suggestions_to_create)} new suggestions")

        if suggestions_to_update:
            cls.objects.bulk_update(suggestions_to_update, ['frequency'], batch_size=batch_size)
            print(f"Updated {len(suggestions_to_update)} existing suggestions")

        elapsed_time = time.time() - start_time
        print(f"Training completed in {elapsed_time:.2f} seconds")
        print(f"Total suggestions in database: {cls.objects.count()}")


class SearchQuery(models.Model):
    """Track search queries for analytics and improving suggestions"""
    query = models.CharField(max_length=255)
    results_count = models.PositiveIntegerField(default=0)
    session_key = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['query', 'created_at']),
            models.Index(fields=['session_key', 'created_at']),
        ]

    def __str__(self):
        return f"'{self.query}' - {self.results_count} results"


