from django.core.management.base import BaseCommand
from scenes_project.scenes_app.models import Scene
import random


class Command(BaseCommand):
    help = 'Test random scene selection functionality'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=5,
            help='Number of random scenes to display (default: 5)'
        )

    def handle(self, *args, **options):
        count = options['count']
        
        # Get total scene count
        total_scenes = Scene.objects.count()
        self.stdout.write(f"Total scenes in database: {total_scenes}")
        
        if total_scenes == 0:
            self.stdout.write(self.style.ERROR("No scenes found in database!"))
            return
        
        self.stdout.write(f"\nGetting {count} random scenes:")
        self.stdout.write("-" * 50)
        
        # Get random scenes using the same logic as the view
        scene_ids = list(Scene.objects.values_list('id', flat=True))
        
        for i in range(min(count, total_scenes)):
            random_id = random.choice(scene_ids)
            scene = Scene.objects.get(id=random_id)
            
            self.stdout.write(f"{i+1}. ID: {scene.id} - {scene.title}")
            self.stdout.write(f"   Country: {scene.country}, Setting: {scene.setting}, Emotion: {scene.emotion}")
            self.stdout.write(f"   Ages: {scene.effeminate_age}/{scene.masculine_age}")
            self.stdout.write("")
        
        self.stdout.write(self.style.SUCCESS("Random scene test completed!"))