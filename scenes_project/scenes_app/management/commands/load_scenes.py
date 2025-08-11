from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import connection
import json
import os
from ...models import Scene

class Command(BaseCommand):
    help = 'Reload all scenes from scenes.json file'

    def handle(self, *args, **options):
        json_path = os.path.join(settings.BASE_DIR, 'scenes.json')
        
        if not os.path.exists(json_path):
            self.stdout.write(
                self.style.ERROR(f'scenes.json not found at {json_path}')
            )
            return
        
        try:
            with open(json_path, 'r', encoding='utf-8') as file:
                scenes_data = json.load(file)
            
            self.stdout.write(f'Found {len(scenes_data)} scenes in JSON file')
            
            # Clear existing scenes
            Scene.objects.all().delete()
            self.stdout.write('Cleared existing scenes from database')
            
            # Reset auto-increment sequence
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM sqlite_sequence WHERE name='scenes_app_scene';")
            self.stdout.write('Reset ID sequence')
            
            # Load scenes from JSON
            created_count = 0
            for scene_data in scenes_data:
                try:
                    scene = Scene.objects.create(
                        title=scene_data.get('title', ''),
                        effeminate_age=scene_data.get('effeminateAge', 25),
                        masculine_age=scene_data.get('masculineAge', 30),
                        country=scene_data.get('country', ''),
                        setting=scene_data.get('setting', ''),
                        emotion=scene_data.get('emotion', ''),
                        details=scene_data.get('details', {}),
                        full_text=scene_data.get('fullText', '')
                    )
                    created_count += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'Error creating scene "{scene_data.get("title", "Unknown")}": {e}')
                    )
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully loaded {created_count} scenes into database')
            )
            
            # Verify count and ID sequence
            db_count = Scene.objects.count()
            first_scene = Scene.objects.first()
            last_scene = Scene.objects.last()
            
            self.stdout.write(f'Database now contains {db_count} scenes')
            if first_scene and last_scene:
                self.stdout.write(f'ID range: {first_scene.id} to {last_scene.id}')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error loading scenes: {e}')
            )
