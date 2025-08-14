from django.core.management.base import BaseCommand
from scenes_project.scenes_app.models import SceneImage
from PIL import Image, ImageOps
from io import BytesIO
from django.core.files.base import ContentFile
import os


class Command(BaseCommand):
    help = 'Regenerate missing image variants for existing SceneImages'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force regeneration of all variants, even if they exist',
        )

    def handle(self, *args, **options):
        force = options['force']
        
        images = SceneImage.objects.all()
        total = images.count()
        
        self.stdout.write(f"Processing {total} images...")
        
        for i, scene_image in enumerate(images, 1):
            self.stdout.write(f"Processing image {i}/{total}: {scene_image}")
            
            try:
                # Check if variants need to be created
                needs_variants = force or not all([
                    scene_image.large_image,
                    scene_image.medium_image,
                    scene_image.small_image,
                    scene_image.thumbnail
                ])
                
                if needs_variants and scene_image.original_image:
                    self._regenerate_variants(scene_image, force)
                    self.stdout.write(f"  ✓ Regenerated variants for {scene_image}")
                else:
                    self.stdout.write(f"  - Skipped {scene_image} (variants exist)")
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"  ✗ Error processing {scene_image}: {str(e)}")
                )
        
        self.stdout.write(
            self.style.SUCCESS(f"Completed processing {total} images")
        )

    def _regenerate_variants(self, scene_image, force=False):
        """Regenerate image variants for a SceneImage"""
        if not scene_image.original_image:
            return
            
        try:
            with Image.open(scene_image.original_image) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'P', 'LA'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')

                # Update metadata if missing
                if not scene_image.width or not scene_image.height:
                    scene_image.width = img.width
                    scene_image.height = img.height
                    scene_image.format = img.format or 'JPEG'
                    
                    if hasattr(scene_image.original_image, 'size'):
                        scene_image.file_size = scene_image.original_image.size

                # Generate variants
                variants = [
                    ('large', (1920, 1080), 85, False),
                    ('medium', (800, 600), 80, False),
                    ('small', (400, 300), 75, False),
                    ('thumbnail', (150, 150), 70, True),
                ]
                
                for variant_name, max_size, quality, crop in variants:
                    field_name = f"{variant_name}_image" if variant_name != 'thumbnail' else 'thumbnail'
                    field = getattr(scene_image, field_name)
                    if force or not field:
                        self._create_variant(scene_image, img, variant_name, max_size, quality, crop)
                
                # Save the model
                scene_image.save()
                
        except Exception as e:
            raise Exception(f"Error processing image: {str(e)}")

    def _create_variant(self, scene_image, img, variant_name, max_size, quality, crop=False):
        """Create a single image variant"""
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
            original_name = os.path.splitext(scene_image.original_image.name)[0]
            filename = f"{os.path.basename(original_name)}_{variant_name}.jpg"
            
            # Save to the appropriate field
            field_name = f"{variant_name}_image" if variant_name != 'thumbnail' else 'thumbnail'
            field = getattr(scene_image, field_name)
            field.save(
                filename,
                ContentFile(output.getvalue()),
                save=False
            )
            
        except Exception as e:
            raise Exception(f"Error creating {variant_name} variant: {str(e)}")