from django.core.management.base import BaseCommand
from django.core.cache import cache
from ...utils.cached_analytics import cached_analytics

class Command(BaseCommand):
    help = 'Manage analytics cache'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all analytics cache'
        )
        parser.add_argument(
            '--warm',
            action='store_true',
            help='Warm up the cache with fresh data'
        )
        parser.add_argument(
            '--stats',
            action='store_true',
            help='Show cache statistics'
        )

    def handle(self, *args, **options):
        if options['clear']:
            cached_analytics.invalidate_cache('all')
            self.stdout.write(
                self.style.SUCCESS('✅ Analytics cache cleared')
            )
        
        if options['warm']:
            self.stdout.write('🔥 Warming up analytics cache...')
            # Generate fresh analytics data
            analytics_data = cached_analytics.analyze_scenes_cached()
            if analytics_data.get('error'):
                self.stdout.write(
                    self.style.ERROR(f'❌ Error warming cache: {analytics_data["error"]}')
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS('✅ Analytics cache warmed up')
                )
        
        if options['stats']:
            try:
                # Try to get cache stats
                cache_stats = cache._cache.get_stats()
                self.stdout.write(f"📊 Cache Statistics: {cache_stats}")
            except:
                self.stdout.write("📊 Cache statistics not available")