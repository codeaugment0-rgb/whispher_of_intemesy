from django.core.management.base import BaseCommand
from ...models import Scene, FavoriteScene


class Command(BaseCommand):
    help = 'Test the favorites functionality'

    def handle(self, *args, **options):
        # Get first scene
        scene = Scene.objects.first()
        if not scene:
            self.stdout.write(self.style.ERROR('No scenes found. Please load scenes first.'))
            return

        # Test session key
        test_session = 'test_session_123'
        
        # Test adding to favorites
        favorite, created = FavoriteScene.objects.get_or_create(
            scene=scene,
            session_key=test_session
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully added "{scene.title}" to favorites')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'"{scene.title}" was already in favorites')
            )
        
        # Test favorite count
        count = scene.favorite_count
        self.stdout.write(f'Scene "{scene.title}" has {count} favorite(s)')
        
        # Test removing from favorites
        favorite.delete()
        self.stdout.write(
            self.style.SUCCESS(f'Successfully removed "{scene.title}" from favorites')
        )
        
        # Test favorite count after removal
        count = scene.favorite_count
        self.stdout.write(f'Scene "{scene.title}" now has {count} favorite(s)')
        
        self.stdout.write(self.style.SUCCESS('Favorites functionality test completed!'))