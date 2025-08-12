from django.core.management.base import BaseCommand
from django.utils import timezone
from scenes_project.scenes_app.models import SearchSuggestion
from scenes_project.scenes_app.signals import cleanup_unused_suggestions
import time


class Command(BaseCommand):
    help = 'Clean up unused search suggestions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--min-frequency',
            type=int,
            default=1,
            help='Remove suggestions with frequency below this threshold (default: 1)',
        )
        parser.add_argument(
            '--days-old',
            type=int,
            help='Remove suggestions older than this many days',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        start_time = time.time()
        
        self.stdout.write(
            self.style.SUCCESS('Starting search suggestions cleanup...')
        )
        
        initial_count = SearchSuggestion.objects.count()
        
        # Clean up unused suggestions (those not in any current scene)
        if not options['dry_run']:
            unused_count = cleanup_unused_suggestions()
        else:
            # For dry run, just count what would be removed
            from scenes_project.scenes_app.models import Scene
            import re
            
            current_terms = set()
            for scene in Scene.objects.all():
                title_words = re.findall(r'\b\w{3,}\b', scene.title.lower())
                current_terms.update(title_words)
                current_terms.add(scene.title.lower())
                current_terms.add(scene.country.lower())
                current_terms.add(scene.setting.lower())
                current_terms.add(scene.emotion.lower())
                
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
            
            unused_count = SearchSuggestion.objects.exclude(term__in=current_terms).count()
        
        # Clean up low-frequency suggestions
        low_freq_query = SearchSuggestion.objects.filter(frequency__lt=options['min_frequency'])
        low_freq_count = low_freq_query.count()
        
        if not options['dry_run'] and low_freq_count > 0:
            low_freq_query.delete()
        
        # Clean up old suggestions
        old_count = 0
        if options['days_old']:
            cutoff_date = timezone.now() - timezone.timedelta(days=options['days_old'])
            old_query = SearchSuggestion.objects.filter(last_used__lt=cutoff_date)
            old_count = old_query.count()
            
            if not options['dry_run'] and old_count > 0:
                old_query.delete()
        
        final_count = SearchSuggestion.objects.count() if not options['dry_run'] else initial_count
        total_removed = unused_count + low_freq_count + old_count
        
        # Show results
        self.stdout.write('\n' + '='*50)
        if options['dry_run']:
            self.stdout.write('CLEANUP PREVIEW (DRY RUN)')
        else:
            self.stdout.write('CLEANUP COMPLETE')
        self.stdout.write('='*50)
        
        self.stdout.write(f'Initial suggestions: {initial_count}')
        if not options['dry_run']:
            self.stdout.write(f'Final suggestions: {final_count}')
        
        self.stdout.write(f'\nSuggestions that would be removed:')
        self.stdout.write(f'  Unused (not in any scene): {unused_count}')
        self.stdout.write(f'  Low frequency (< {options["min_frequency"]}): {low_freq_count}')
        if options['days_old']:
            self.stdout.write(f'  Old (> {options["days_old"]} days): {old_count}')
        self.stdout.write(f'  Total: {total_removed}')
        
        if options['dry_run']:
            self.stdout.write(f'\nRun without --dry-run to actually perform the cleanup.')
        else:
            elapsed_time = time.time() - start_time
            self.stdout.write(f'\nCleanup completed in {elapsed_time:.2f} seconds')
            self.stdout.write(
                self.style.SUCCESS('✓ Search suggestions cleanup successful!')
            )
