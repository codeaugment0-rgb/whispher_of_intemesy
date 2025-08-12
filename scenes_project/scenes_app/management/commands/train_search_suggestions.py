from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import models
from scenes_project.scenes_app.models import SearchSuggestion, Scene
import time


class Command(BaseCommand):
    help = 'Train search suggestions from existing scene data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing suggestions before training',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed progress information',
        )

    def handle(self, *args, **options):
        start_time = time.time()
        
        self.stdout.write(
            self.style.SUCCESS('Starting search suggestions training...')
        )
        
        # Clear existing suggestions if requested
        if options['clear']:
            count = SearchSuggestion.objects.count()
            SearchSuggestion.objects.all().delete()
            self.stdout.write(
                self.style.WARNING(f'Cleared {count} existing suggestions')
            )
        
        # Get initial counts
        initial_count = SearchSuggestion.objects.count()
        scene_count = Scene.objects.count()
        
        if scene_count == 0:
            self.stdout.write(
                self.style.ERROR('No scenes found in database. Please add scenes first.')
            )
            return
        
        self.stdout.write(f'Training from {scene_count} scenes...')
        
        # Train suggestions with improved performance
        try:
            # Use batch processing for better performance
            batch_size = 50 if scene_count < 1000 else 100
            SearchSuggestion.train_from_scenes(batch_size=batch_size)

            # Get final counts
            final_count = SearchSuggestion.objects.count()
            new_suggestions = final_count - initial_count

            # Show statistics
            self.stdout.write('\n' + '='*60)
            self.stdout.write('ENHANCED TRAINING COMPLETE')
            self.stdout.write('='*60)
            self.stdout.write(f'Scenes processed: {scene_count}')
            self.stdout.write(f'Initial suggestions: {initial_count}')
            self.stdout.write(f'Final suggestions: {final_count}')
            self.stdout.write(f'New suggestions: {new_suggestions}')

            # Show breakdown by type
            if options['verbose']:
                self.stdout.write('\nSuggestion breakdown by type:')
                for suggestion_type, display_name in SearchSuggestion.SUGGESTION_TYPES:
                    count = SearchSuggestion.objects.filter(suggestion_type=suggestion_type).count()
                    avg_freq = SearchSuggestion.objects.filter(suggestion_type=suggestion_type).aggregate(
                        avg_freq=models.Avg('frequency')
                    )['avg_freq'] or 0
                    self.stdout.write(f'  {display_name}: {count} (avg freq: {avg_freq:.1f})')

                # Show top suggestions by type
                self.stdout.write('\nTop suggestions by type:')
                for suggestion_type, display_name in SearchSuggestion.SUGGESTION_TYPES:
                    top_suggestions = SearchSuggestion.objects.filter(
                        suggestion_type=suggestion_type
                    ).order_by('-frequency')[:5]

                    if top_suggestions:
                        self.stdout.write(f'\n  {display_name}:')
                        for i, suggestion in enumerate(top_suggestions, 1):
                            self.stdout.write(
                                f'    {i}. {suggestion.term} ({suggestion.frequency} uses)'
                            )

            elapsed_time = time.time() - start_time
            self.stdout.write(f'\nTraining completed in {elapsed_time:.2f} seconds')

            # Performance metrics
            if scene_count > 0:
                scenes_per_second = scene_count / elapsed_time
                self.stdout.write(f'Performance: {scenes_per_second:.1f} scenes/second')

            self.stdout.write(
                self.style.SUCCESS('✓ Enhanced search suggestions training successful!')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Training failed: {str(e)}')
            )
            raise
