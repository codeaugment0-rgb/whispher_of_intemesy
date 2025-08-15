from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.core.files.storage import default_storage
from django.conf import settings
import re
import os
from PIL import Image, ImageOps
from io import BytesIO
from django.core.files.base import ContentFile
import uuid


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
    
    @property
    def primary_image(self):
        """Get the primary image for this scene"""
        primary = self.scene_images.filter(is_primary=True).first()
        if primary:
            return primary
        # Fallback to first image if no primary is set
        return self.scene_images.first()


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


class SceneImage(models.Model):
    """Model for storing multiple images per scene with metadata and optimization"""
    scene = models.ForeignKey(Scene, on_delete=models.CASCADE, related_name='scene_images')
    
    # Image files
    original_image = models.ImageField(upload_to='scene_images/originals/')
    large_image = models.ImageField(upload_to='scene_images/large/', blank=True, null=True)
    medium_image = models.ImageField(upload_to='scene_images/medium/', blank=True, null=True)
    small_image = models.ImageField(upload_to='scene_images/small/', blank=True, null=True)
    thumbnail = models.ImageField(upload_to='scene_images/thumbnails/', blank=True, null=True)
    
    # Metadata
    caption = models.CharField(max_length=500, blank=True, help_text="Image caption or title")
    alt_text = models.CharField(max_length=255, blank=True, help_text="Alt text for accessibility")
    description = models.TextField(blank=True, help_text="Detailed description of the image")
    
    # Organization
    order = models.PositiveIntegerField(default=0, help_text="Order of image in gallery")
    is_primary = models.BooleanField(default=False, help_text="Primary image for the scene")
    
    # Technical metadata
    file_size = models.PositiveIntegerField(default=0, help_text="Original file size in bytes")
    width = models.PositiveIntegerField(default=0)
    height = models.PositiveIntegerField(default=0)
    format = models.CharField(max_length=10, blank=True, help_text="Image format (JPEG, PNG, etc.)")
    
    # Timestamps
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Unique identifier for API operations
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    class Meta:
        ordering = ['order', 'uploaded_at']
        indexes = [
            models.Index(fields=['scene', 'order']),
            models.Index(fields=['scene', 'is_primary']),
            models.Index(fields=['uploaded_at']),
        ]

    def __str__(self):
        return f"{self.scene.title} - Image {self.order + 1}"

    def save(self, *args, **kwargs):
        """Override save to generate optimized images and metadata"""
        if self.original_image and not self.pk:  # New image
            self._process_image()
        
        # Ensure only one primary image per scene
        if self.is_primary:
            SceneImage.objects.filter(scene=self.scene, is_primary=True).exclude(pk=self.pk).update(is_primary=False)
        
        super().save(*args, **kwargs)

    def _process_image(self):
        """Process the original image to create optimized versions"""
        if not self.original_image:
            return

        try:
            # Open the original image
            with Image.open(self.original_image) as img:
                # Convert to RGB if necessary (handles RGBA, P mode images)
                if img.mode in ('RGBA', 'P', 'LA'):
                    # Create white background for transparency
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')

                # Store original dimensions and metadata
                self.width = img.width
                self.height = img.height
                self.format = img.format or 'JPEG'
                
                # Calculate file size
                if hasattr(self.original_image, 'size'):
                    self.file_size = self.original_image.size

                # Generate optimized versions
                self._create_image_variant(img, 'large', (1920, 1080), 85)
                self._create_image_variant(img, 'medium', (800, 600), 80)
                self._create_image_variant(img, 'small', (400, 300), 75)
                self._create_image_variant(img, 'thumbnail', (150, 150), 70, crop=True)

        except Exception as e:
            print(f"Error processing image {self.original_image.name}: {str(e)}")

    def _create_image_variant(self, img, variant_name, max_size, quality, crop=False):
        """Create an optimized image variant"""
        try:
            # Create a copy of the image
            variant_img = img.copy()
            
            if crop:
                # For thumbnails, crop to square
                variant_img = ImageOps.fit(variant_img, max_size, Image.Resampling.LANCZOS)
            else:
                # Resize maintaining aspect ratio
                variant_img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save to BytesIO
            output = BytesIO()
            variant_img.save(output, format='JPEG', quality=quality, optimize=True)
            output.seek(0)
            
            # Generate filename
            original_name = os.path.splitext(self.original_image.name)[0]
            filename = f"{original_name}_{variant_name}.jpg"
            
            # Save to the appropriate field
            field = getattr(self, f"{variant_name}_image")
            field.save(
                filename,
                ContentFile(output.getvalue()),
                save=False
            )
            
        except Exception as e:
            print(f"Error creating {variant_name} variant: {str(e)}")

    def delete(self, *args, **kwargs):
        """Override delete to clean up all image files"""
        # Delete all image files
        for field_name in ['original_image', 'large_image', 'medium_image', 'small_image', 'thumbnail']:
            field = getattr(self, field_name)
            if field:
                try:
                    if default_storage.exists(field.name):
                        default_storage.delete(field.name)
                except Exception as e:
                    print(f"Error deleting {field_name}: {str(e)}")
        
        super().delete(*args, **kwargs)

    @property
    def file_size_human(self):
        """Return human-readable file size"""
        if self.file_size == 0:
            return "0 B"
        
        size_names = ["B", "KB", "MB", "GB"]
        size = self.file_size
        i = 0
        while size >= 1024 and i < len(size_names) - 1:
            size /= 1024.0
            i += 1
        return f"{size:.1f} {size_names[i]}"

    @property
    def aspect_ratio(self):
        """Return aspect ratio as a decimal"""
        if self.height == 0:
            return 1.0
        return self.width / self.height

    def get_image_url(self, size='medium'):
        """Get URL for specific image size"""
        size_field_map = {
            'original': 'original_image',
            'large': 'large_image',
            'medium': 'medium_image',
            'small': 'small_image',
            'thumbnail': 'thumbnail'
        }
        
        field_name = size_field_map.get(size, 'medium_image')
        field = getattr(self, field_name)
        
        if field and hasattr(field, 'url'):
            return field.url
        
        # Fallback to original if requested size doesn't exist
        if self.original_image and hasattr(self.original_image, 'url'):
            return self.original_image.url
        
        return None
