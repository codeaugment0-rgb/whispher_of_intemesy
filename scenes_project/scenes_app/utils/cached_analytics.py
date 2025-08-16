from django.core.cache import cache
from django.conf import settings
from django.db.models import Count, Avg, Min, Max, Q
from django.db import connection
from collections import Counter
import hashlib
import json
import time

class CachedAnalytics:
    """
    Redis-cached analytics that preserves ALL features from your original analytics.py
    """
    
    def __init__(self):
        self.cache_timeouts = getattr(settings, 'ANALYTICS_CACHE_TIMEOUTS', {
            'full_analytics': 1800,
            'filtered_analytics': 900,
            'field_distributions': 600,
            'age_ranges': 1200,
            'details_analysis': 1800,
            'sync_check': 300,
        })
        self.debug = True
    
    def analyze_scenes_cached(self, limit_charts=0, limit_favorites=0, filters=None):
        """
        Main analytics function with Redis caching
        Preserves ALL functionality from your original analyze_scenes()
        """
        # Generate cache key based on parameters
        cache_key = self._generate_cache_key('full_analytics', {
            'limit_charts': limit_charts,
            'limit_favorites': limit_favorites,
            'filters': filters or {}
        })
        
        # Try to get from cache first
        if self.debug:
            print(f"Checking cache for key: {cache_key}")
        
        cached_data = cache.get(cache_key)
        if cached_data:
            if self.debug:
                print("✅ Analytics data found in cache!")
            cached_data['cache_info'] = {
                'cached': True,
                'cache_key': cache_key,
                'source': 'redis'
            }
            return cached_data
        
        if self.debug:
            print("❌ Cache miss - generating fresh analytics data...")
            start_time = time.time()
        
        # Generate fresh analytics data
        analytics_data = self._generate_fresh_analytics(limit_charts, limit_favorites, filters)
        
        if analytics_data.get('error'):
            return analytics_data
        
        # Cache the result
        cache.set(cache_key, analytics_data, self.cache_timeouts['full_analytics'])
        
        if self.debug:
            elapsed = time.time() - start_time
            print(f"✅ Fresh analytics generated and cached in {elapsed:.2f}s")
        
        analytics_data['cache_info'] = {
            'cached': False,
            'cache_key': cache_key,
            'source': 'database',
            'generation_time': elapsed if self.debug else None
        }
        
        return analytics_data
    
    def _generate_fresh_analytics(self, limit_charts=0, limit_favorites=0, filters=None):
        """
        Generate fresh analytics data using optimized queries
        This preserves ALL your original analytics.py functionality
        """
        try:
            from django.apps import apps
            Scene = apps.get_model('scenes_app', 'Scene')
            FavoriteScene = apps.get_model('scenes_app', 'FavoriteScene')
            
            # Apply filters if provided
            queryset = Scene.objects.all()
            if filters:
                if filters.get('country') and filters['country'] != 'all':
                    queryset = queryset.filter(country=filters['country'])
                if filters.get('setting') and filters['setting'] != 'all':
                    queryset = queryset.filter(setting=filters['setting'])
                if filters.get('emotion') and filters['emotion'] != 'all':
                    queryset = queryset.filter(emotion=filters['emotion'])
                if filters.get('ageRange') and filters['ageRange'] != 'all':
                    age_range = filters['ageRange']
                    if '+' in age_range:
                        min_age = int(age_range.replace('+', ''))
                        queryset = queryset.filter(effeminate_age__gte=min_age)
                    elif '-' in age_range:
                        min_age, max_age = map(int, age_range.split('-'))
                        queryset = queryset.filter(effeminate_age__gte=min_age, effeminate_age__lte=max_age)
            
            # Basic statistics using single query
            basic_stats = queryset.aggregate(
                total_scenes=Count('id'),
                avg_effeminate_age=Avg('effeminate_age'),
                avg_masculine_age=Avg('masculine_age'),
                min_effeminate_age=Min('effeminate_age'),
                max_effeminate_age=Max('effeminate_age'),
                min_masculine_age=Min('masculine_age'),
                max_masculine_age=Max('masculine_age')
            )
            
            total_scenes = basic_stats['total_scenes']
            
            if total_scenes == 0:
                return self._empty_analytics_response()
            
            # Get total favorites count
            if filters:
                scene_ids = list(queryset.values_list('id', flat=True))
                total_favorites = FavoriteScene.objects.filter(scene_id__in=scene_ids).count()
            else:
                total_favorites = FavoriteScene.objects.count()
            
            # Field distributions with caching
            country_data = self._get_cached_field_distribution('country', queryset)
            setting_data = self._get_cached_field_distribution('setting', queryset)
            emotion_data = self._get_cached_field_distribution('emotion', queryset)
            
            # Age ranges with caching
            age_ranges = self._get_cached_age_ranges(queryset)
            
            # Most favorited scenes
            most_favorited = self._get_most_favorited_scenes(queryset, limit_favorites)
            
            # Details analysis with caching
            appearance_stats = self._get_cached_details_analysis('appearance', queryset)
            hair_stats = self._get_cached_details_analysis('hair', queryset)
            clothing_stats = self._get_cached_details_analysis('clothing', queryset)
            atmosphere_stats = self._get_cached_atmosphere_analysis(queryset)
            
            # Recent activity calculation (preserved from original)
            recent_scenes = self._calculate_recent_activity(total_scenes)
            
            # Data sync check with caching
            sync_info = self._get_cached_sync_check()
            
            # Format data for JavaScript consumption
            return {
                # Stats object expected by JavaScript
                'stats': {
                    'total_scenes': total_scenes,
                    'total_favorites': total_favorites,
                    'avg_effeminate_age': round(basic_stats['avg_effeminate_age'] or 0, 1),
                    'avg_masculine_age': round(basic_stats['avg_masculine_age'] or 0, 1),
                    'favorite_rate': round((total_favorites / total_scenes) * 100, 1) if total_scenes > 0 else 0,
                },
                
                # Charts object expected by JavaScript
                'charts': {
                    'countries': {
                        'labels': [item['country'] for item in country_data],
                        'data': [item['count'] for item in country_data]
                    },
                    'settings': {
                        'labels': [item['setting'] for item in setting_data],
                        'data': [item['count'] for item in setting_data]
                    },
                    'emotions': {
                        'labels': [item['emotion'] for item in emotion_data],
                        'data': [item['count'] for item in emotion_data]
                    },
                    'age_ranges': {
                        'labels': list(age_ranges.keys()),
                        'data': list(age_ranges.values())
                    }
                },
                
                # Most favorited scenes
                'most_favorited': most_favorited,
                
                # Legacy fields for template compatibility
                'total_scenes': total_scenes,
                'total_favorites': total_favorites,
                'avg_effeminate_age': round(basic_stats['avg_effeminate_age'] or 0, 1),
                'avg_masculine_age': round(basic_stats['avg_masculine_age'] or 0, 1),
                'min_effeminate_age': basic_stats['min_effeminate_age'] or 0,
                'max_effeminate_age': basic_stats['max_effeminate_age'] or 0,
                'min_masculine_age': basic_stats['min_masculine_age'] or 0,
                'max_masculine_age': basic_stats['max_masculine_age'] or 0,
                'country_data': country_data,
                'setting_data': setting_data,
                'emotion_data': emotion_data,
                'age_ranges': age_ranges,
                'appearance_stats': appearance_stats,
                'hair_stats': hair_stats,
                'clothing_stats': clothing_stats,
                'atmosphere_stats': atmosphere_stats,
                'recent_scenes': recent_scenes,
                'favorite_rate': round((total_favorites / total_scenes) * 100, 1) if total_scenes > 0 else 0,
                'data_summary': {
                    'unique_countries': len(country_data),
                    'unique_settings': len(setting_data),
                    'unique_emotions': len(emotion_data),
                    'age_range_span': (basic_stats['max_effeminate_age'] or 0) - (basic_stats['min_effeminate_age'] or 0)
                },
                'sync_info': sync_info
            }
            
        except Exception as e:
            return {'error': f'Cached analytics error: {str(e)}'}
    
    def _get_cached_field_distribution(self, field_name, queryset=None):
        """Get field distribution with caching"""
        cache_key = self._generate_cache_key('field_dist', {'field': field_name})
        
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data
        
        # Generate fresh data
        if queryset is None:
            from django.apps import apps
            Scene = apps.get_model('scenes_app', 'Scene')
            queryset = Scene.objects.all()
        
        data = list(queryset.values(field_name)
                   .annotate(count=Count(field_name))
                   .order_by('-count'))
        
        cache.set(cache_key, data, self.cache_timeouts['field_distributions'])
        return data
    
    def _get_cached_age_ranges(self, queryset=None):
        """Get age ranges with caching"""
        cache_key = self._generate_cache_key('age_ranges', {})
        
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data
        
        # Generate fresh age ranges (preserving your original logic)
        if queryset is None:
            from django.apps import apps
            Scene = apps.get_model('scenes_app', 'Scene')
            queryset = Scene.objects.all()
        
        age_stats = queryset.aggregate(
            min_age=Min('effeminate_age'),
            max_age=Max('effeminate_age')
        )
        
        min_age = age_stats['min_age'] or 18
        max_age = age_stats['max_age'] or 65
        
        # Dynamic range calculation (same as your original)
        if max_age - min_age <= 20:
            ranges = {}
            for start in range(min_age, max_age + 1, 5):
                end = min(start + 4, max_age)
                range_key = f"{start}-{end}"
                count = queryset.filter(
                    effeminate_age__gte=start,
                    effeminate_age__lte=end
                ).count()
                ranges[range_key] = count
        else:
            ranges = {}
            for start in range(min_age, max_age + 1, 10):
                end = min(start + 9, max_age)
                if start == max_age:
                    range_key = f"{start}+"
                    count = queryset.filter(effeminate_age__gte=start).count()
                else:
                    range_key = f"{start}-{end}"
                    count = queryset.filter(
                        effeminate_age__gte=start,
                        effeminate_age__lte=end
                    ).count()
                ranges[range_key] = count
        
        cache.set(cache_key, ranges, self.cache_timeouts['age_ranges'])
        return ranges
    
    def _get_cached_details_analysis(self, field_type, queryset=None):
        """Get details analysis with caching (appearance, hair, clothing)"""
        cache_key = self._generate_cache_key('details', {'field': field_type})
        
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data
        
        # Generate fresh details analysis using optimized cursor approach
        effeminate_data = Counter()
        masculine_data = Counter()
        
        if queryset is None:
            sql = "SELECT details FROM scenes_app_scene WHERE details IS NOT NULL"
        else:
            # Get IDs from queryset and use in SQL
            scene_ids = list(queryset.values_list('id', flat=True))
            if not scene_ids:
                return {'effeminate': {}, 'masculine': {}}
            
            ids_str = ','.join(map(str, scene_ids))
            sql = f"SELECT details FROM scenes_app_scene WHERE id IN ({ids_str}) AND details IS NOT NULL"
        
        with connection.cursor() as cursor:
            cursor.execute(sql)
            
            for (details_json,) in cursor.fetchall():
                if not details_json:
                    continue
                
                try:
                    details = json.loads(details_json) if isinstance(details_json, str) else details_json
                    
                    # Effeminate details
                    eff_details = details.get('effeminate', {})
                    if field_type in eff_details:
                        value = eff_details[field_type].lower().strip()
                        if value:
                            effeminate_data[value] += 1
                    
                    # Masculine details
                    masc_details = details.get('masculine', {})
                    if field_type in masc_details:
                        value = masc_details[field_type].lower().strip()
                        if value:
                            masculine_data[value] += 1
                            
                except (json.JSONDecodeError, AttributeError, TypeError):
                    continue
        
        result = {
            'effeminate': dict(effeminate_data.most_common(10)),
            'masculine': dict(masculine_data.most_common(10))
        }
        
        cache.set(cache_key, result, self.cache_timeouts['details_analysis'])
        return result
    
    def _get_cached_atmosphere_analysis(self, queryset=None):
        """Get atmosphere analysis with caching"""
        cache_key = self._generate_cache_key('atmosphere', {})
        
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data
        
        # Generate fresh atmosphere analysis
        lighting_data = Counter()
        scent_data = Counter()
        sound_data = Counter()
        
        if queryset is None:
            sql = "SELECT details FROM scenes_app_scene WHERE details IS NOT NULL"
        else:
            scene_ids = list(queryset.values_list('id', flat=True))
            if not scene_ids:
                return {'lighting': {}, 'scent': {}, 'sound': {}}
            
            ids_str = ','.join(map(str, scene_ids))
            sql = f"SELECT details FROM scenes_app_scene WHERE id IN ({ids_str}) AND details IS NOT NULL"
        
        with connection.cursor() as cursor:
            cursor.execute(sql)
            
            for (details_json,) in cursor.fetchall():
                if not details_json:
                    continue
                
                try:
                    details = json.loads(details_json) if isinstance(details_json, str) else details_json
                    atmosphere = details.get('atmosphere', {})
                    
                    for field, counter in [
                        ('lighting', lighting_data),
                        ('scent', scent_data),
                        ('sound', sound_data)
                    ]:
                        if field in atmosphere:
                            value = atmosphere[field].lower().strip()
                            if value:
                                counter[value] += 1
                                
                except (json.JSONDecodeError, AttributeError, TypeError):
                    continue
        
        result = {
            'lighting': dict(lighting_data.most_common(10)),
            'scent': dict(scent_data.most_common(10)),
            'sound': dict(sound_data.most_common(10))
        }
        
        cache.set(cache_key, result, self.cache_timeouts['details_analysis'])
        return result
    
    def _get_most_favorited_scenes(self, queryset, limit_favorites):
        """Get most favorited scenes"""
        most_favorited_query = queryset.annotate(
            fav_count=Count('favorites')
        ).filter(fav_count__gt=0).order_by('-fav_count')
        
        if limit_favorites and limit_favorites > 0:
            return list(most_favorited_query[:limit_favorites])
        else:
            return list(most_favorited_query)
    
    def _calculate_recent_activity(self, total_scenes):
        """Calculate recent activity (preserved from original)"""
        if total_scenes == 0:
            return {'today': 0, 'this_week': 0, 'this_month': 0}
        
        recent_threshold = max(1, total_scenes // 10)
        
        return {
            'today': min(recent_threshold // 7, total_scenes),
            'this_week': min(recent_threshold, total_scenes),
            'this_month': total_scenes
        }
    
    def _get_cached_sync_check(self):
        """Get sync check with caching"""
        cache_key = self._generate_cache_key('sync_check', {})
        
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data
        
        # Generate fresh sync check (preserved from original)
        try:
            from django.apps import apps
            from django.conf import settings
            import os
            
            Scene = apps.get_model('scenes_app', 'Scene')
            db_count = Scene.objects.count()
            
            try:
                json_path = os.path.join(settings.BASE_DIR, 'scenes.json')
                with open(json_path, 'r') as f:
                    json_data = json.load(f)
                    json_count = len(json_data)
            except:
                json_count = 0
            
            result = {
                'db_count': db_count,
                'json_count': json_count,
                'synced': db_count == json_count
            }
        except Exception as e:
            result = {'error': str(e)}
        
        cache.set(cache_key, result, self.cache_timeouts['sync_check'])
        return result
    
    def _generate_cache_key(self, prefix, params):
        """Generate unique cache key from parameters"""
        key_data = json.dumps(params, sort_keys=True)
        key_hash = hashlib.md5(key_data.encode()).hexdigest()[:8]
        return f"analytics_{prefix}_{key_hash}"
    
    def _empty_analytics_response(self):
        """Return empty response preserving structure"""
        return {
            'error': 'No scenes available for analysis',
            
            # Stats object expected by JavaScript
            'stats': {
                'total_scenes': 0,
                'total_favorites': 0,
                'avg_effeminate_age': 0,
                'avg_masculine_age': 0,
                'favorite_rate': 0,
            },
            
            # Charts object expected by JavaScript
            'charts': {
                'countries': {'labels': [], 'data': []},
                'settings': {'labels': [], 'data': []},
                'emotions': {'labels': [], 'data': []},
                'age_ranges': {'labels': [], 'data': []}
            },
            
            # Most favorited scenes
            'most_favorited': [],
            
            # Legacy fields for template compatibility
            'total_scenes': 0,
            'total_favorites': 0,
            'country_data': [],
            'setting_data': [],
            'emotion_data': [],
            'age_ranges': {},
            'appearance_stats': {'effeminate': {}, 'masculine': {}},
            'hair_stats': {'effeminate': {}, 'masculine': {}},
            'clothing_stats': {'effeminate': {}, 'masculine': {}},
            'atmosphere_stats': {'lighting': {}, 'scent': {}, 'sound': {}},
            'recent_scenes': {'today': 0, 'this_week': 0, 'this_month': 0},
            'favorite_rate': 0
        }
    
    def invalidate_cache(self, cache_type=None):
        """Invalidate specific or all analytics caches"""
        if cache_type:
            # Invalidate specific cache type
            if cache_type == 'all':
                cache.delete_pattern('analytics_*')
            else:
                cache.delete_pattern(f'analytics_{cache_type}_*')
        else:
            # Invalidate all analytics caches
            cache.delete_pattern('analytics_*')
        
        if self.debug:
            print(f"🗑️ Cache invalidated: {cache_type or 'all'}")

# Global instance
cached_analytics = CachedAnalytics()