import json
from collections import Counter, defaultdict
from django.db.models import Count, Avg, Q, Min, Max
from django.db import models


def check_data_sync():
    """Check if database is synced with JSON file"""
    try:
        from django.apps import apps
        Scene = apps.get_model('scenes_app', 'Scene')
        
        db_count = Scene.objects.count()
        
        # Try to read JSON file
        try:
            import os
            from django.conf import settings
            json_path = os.path.join(settings.BASE_DIR, 'scenes.json')
            with open(json_path, 'r') as f:
                import json
                json_data = json.load(f)
                json_count = len(json_data)
        except:
            json_count = 0
        
        return {
            'db_count': db_count,
            'json_count': json_count,
            'synced': db_count == json_count
        }
    except Exception as e:
        return {'error': str(e)}


def analyze_scenes(limit_charts=0, limit_favorites=0):
    """
    Flexible analytics for scenes data that adapts to any data changes
    Returns a dictionary with various analytics metrics
    
    Args:
        limit_charts: Number of items to show in charts (0 = no limit)
        limit_favorites: Number of top favorites to show (0 = no limit)
    """
    try:
        # Import models here to avoid circular imports
        from django.apps import apps
        Scene = apps.get_model('scenes_app', 'Scene')
        FavoriteScene = apps.get_model('scenes_app', 'FavoriteScene')
        
        # Basic counts
        total_scenes = Scene.objects.count()
        total_favorites = FavoriteScene.objects.count()
        
        if total_scenes == 0:
            return {
                'error': 'No scenes available for analysis',
                'total_scenes': 0,
                'total_favorites': 0,
                'country_data': [],
                'setting_data': [],
                'emotion_data': [],
                'age_ranges': {},
                'most_favorited': [],
                'appearance_stats': {'effeminate': {}, 'masculine': {}},
                'hair_stats': {'effeminate': {}, 'masculine': {}},
                'clothing_stats': {'effeminate': {}, 'masculine': {}},
                'atmosphere_stats': {'lighting': {}, 'scent': {}, 'sound': {}},
                'recent_scenes': {'today': 0, 'this_week': 0, 'this_month': 0},
                'favorite_rate': 0
            }

        # Dynamic field analysis - automatically detect all unique values
        # Force evaluation and ensure we get ALL data
        all_scenes = Scene.objects.all()
        print(f"DEBUG: Total scenes found: {all_scenes.count()}")
        
        country_data = list(Scene.objects.values('country')
                          .annotate(count=Count('country'))
                          .order_by('-count'))
        print(f"DEBUG: Unique countries found: {len(country_data)}")

        setting_data = list(Scene.objects.values('setting')
                          .annotate(count=Count('setting'))
                          .order_by('-count'))
        print(f"DEBUG: Unique settings found: {len(setting_data)}")

        emotion_data = list(Scene.objects.values('emotion')
                          .annotate(count=Count('emotion'))
                          .order_by('-count'))
        print(f"DEBUG: Unique emotions found: {len(emotion_data)}")

        # Dynamic age analytics - automatically calculate ranges based on actual data
        age_stats = Scene.objects.aggregate(
            avg_effeminate_age=Avg('effeminate_age'),
            avg_masculine_age=Avg('masculine_age'),
            min_effeminate_age=Min('effeminate_age'),
            max_effeminate_age=Max('effeminate_age'),
            min_masculine_age=Min('masculine_age'),
            max_masculine_age=Max('masculine_age')
        )

        # Dynamic age range calculation
        age_ranges = calculate_dynamic_age_ranges(Scene.objects.all())

        # Most favorited scenes (flexible limit)
        favorites_limit = None if limit_favorites == 0 else limit_favorites
        most_favorited_query = Scene.objects.annotate(
            fav_count=Count('favorites')
        ).filter(fav_count__gt=0).order_by('-fav_count')
        
        if favorites_limit:
            most_favorited = list(most_favorited_query[:favorites_limit])
        else:
            most_favorited = list(most_favorited_query)

        # Detailed analytics for appearance, hair, clothing (flexible)
        appearance_stats = analyze_details_field('appearance')
        hair_stats = analyze_details_field('hair')
        clothing_stats = analyze_details_field('clothing')
        atmosphere_stats = analyze_atmosphere_details()

        # Dynamic recent activity calculation
        recent_scenes = calculate_recent_activity(total_scenes)

        # Check data sync
        sync_info = check_data_sync()
        
        return {
            'total_scenes': total_scenes,
            'total_favorites': total_favorites,
            'avg_effeminate_age': round(age_stats['avg_effeminate_age'] or 0, 1),
            'avg_masculine_age': round(age_stats['avg_masculine_age'] or 0, 1),
            'min_effeminate_age': age_stats['min_effeminate_age'] or 0,
            'max_effeminate_age': age_stats['max_effeminate_age'] or 0,
            'min_masculine_age': age_stats['min_masculine_age'] or 0,
            'max_masculine_age': age_stats['max_masculine_age'] or 0,
            'country_data': country_data,
            'setting_data': setting_data,
            'emotion_data': emotion_data,
            'age_ranges': age_ranges,
            'most_favorited': most_favorited,
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
                'age_range_span': (age_stats['max_effeminate_age'] or 0) - (age_stats['min_effeminate_age'] or 0)
            },
            'sync_info': sync_info
        }

    except Exception as e:
        return {'error': f'Analytics error: {str(e)}'}


def calculate_dynamic_age_ranges(scenes_queryset):
    """
    Dynamically calculate age ranges based on actual data distribution
    """
    from django.db.models import Min, Max
    
    # Get age range from actual data
    age_info = scenes_queryset.aggregate(
        min_age=Min('effeminate_age'),
        max_age=Max('effeminate_age')
    )
    
    min_age = age_info['min_age'] or 18
    max_age = age_info['max_age'] or 65
    
    # Create dynamic ranges based on data spread
    if max_age - min_age <= 20:
        # Small range - use 5-year intervals
        ranges = {}
        for start in range(min_age, max_age + 1, 5):
            end = min(start + 4, max_age)
            range_key = f"{start}-{end}"
            ranges[range_key] = 0
    else:
        # Larger range - use 10-year intervals
        ranges = {}
        for start in range(min_age, max_age + 1, 10):
            end = min(start + 9, max_age)
            if start == max_age:
                range_key = f"{start}+"
            else:
                range_key = f"{start}-{end}"
            ranges[range_key] = 0
    
    # Count scenes in each range
    for scene in scenes_queryset:
        eff_age = scene.effeminate_age
        for range_key in ranges.keys():
            if '+' in range_key:
                min_range = int(range_key.replace('+', ''))
                if eff_age >= min_range:
                    ranges[range_key] += 1
                    break
            else:
                min_range, max_range = map(int, range_key.split('-'))
                if min_range <= eff_age <= max_range:
                    ranges[range_key] += 1
                    break
    
    return ranges


def calculate_recent_activity(total_scenes):
    """
    Calculate recent activity based on available data
    Since we don't have created_at, we'll use ID-based approximation
    """
    if total_scenes == 0:
        return {'today': 0, 'this_week': 0, 'this_month': 0}
    
    # Approximate recent activity based on ID distribution
    # This is a rough estimate - in production you'd want actual timestamps
    recent_threshold = max(1, total_scenes // 10)  # Last 10% as "recent"
    
    return {
        'today': min(recent_threshold // 7, total_scenes),  # Rough daily estimate
        'this_week': min(recent_threshold, total_scenes),   # Weekly estimate
        'this_month': total_scenes  # All scenes as monthly (since no timestamps)
    }


def analyze_details_field(field_type):
    """Analyze appearance, hair, or clothing details"""
    from django.apps import apps
    Scene = apps.get_model('scenes_app', 'Scene')
    
    effeminate_data = Counter()
    masculine_data = Counter()
    
    for scene in Scene.objects.all():
        details = scene.details or {}
        
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
    
    return {
        'effeminate': dict(effeminate_data.most_common(10)),
        'masculine': dict(masculine_data.most_common(10))
    }


def analyze_atmosphere_details():
    """Analyze atmosphere details (lighting, scent, sound)"""
    from django.apps import apps
    Scene = apps.get_model('scenes_app', 'Scene')
    
    lighting_data = Counter()
    scent_data = Counter()
    sound_data = Counter()
    
    for scene in Scene.objects.all():
        details = scene.details or {}
        atmosphere = details.get('atmosphere', {})
        
        if 'lighting' in atmosphere:
            value = atmosphere['lighting'].lower().strip()
            if value:
                lighting_data[value] += 1
                
        if 'scent' in atmosphere:
            value = atmosphere['scent'].lower().strip()
            if value:
                scent_data[value] += 1
                
        if 'sound' in atmosphere:
            value = atmosphere['sound'].lower().strip()
            if value:
                sound_data[value] += 1
    
    return {
        'lighting': dict(lighting_data.most_common(10)),
        'scent': dict(scent_data.most_common(10)),
        'sound': dict(sound_data.most_common(10))
    }


def get_analytics_api_data(chart_limit=0):
    """
    Return flexible analytics data formatted for API/AJAX requests
    
    Args:
        chart_limit: Number of items to show in charts (0 = no limit, show all)
    """
    # Always analyze ALL scenes, don't limit the analysis itself
    data = analyze_scenes(limit_charts=0, limit_favorites=0)
    
    if data.get('error'):
        return data
    
    # Apply chart limit only for display, not for analysis
    if chart_limit > 0:
        chart_countries = data['country_data'][:chart_limit]
        chart_settings = data['setting_data'][:chart_limit]
        chart_emotions = data['emotion_data'][:chart_limit]
    else:
        # Show ALL data
        chart_countries = data['country_data']
        chart_settings = data['setting_data']
        chart_emotions = data['emotion_data']
    
    return {
        'charts': {
            'countries': {
                'labels': [item['country'] for item in chart_countries],
                'data': [item['count'] for item in chart_countries]
            },
            'settings': {
                'labels': [item['setting'] for item in chart_settings],
                'data': [item['count'] for item in chart_settings]
            },
            'emotions': {
                'labels': [item['emotion'] for item in chart_emotions],
                'data': [item['count'] for item in chart_emotions]
            },
            'age_ranges': {
                'labels': list(data['age_ranges'].keys()),
                'data': list(data['age_ranges'].values())
            }
        },
        'filters': {
            'countries': [item['country'] for item in data['country_data']],
            'settings': [item['setting'] for item in data['setting_data']],
            'emotions': [item['emotion'] for item in data['emotion_data']]
        },
        'stats': {
            'total_scenes': data['total_scenes'],
            'total_favorites': data['total_favorites'],
            'avg_effeminate_age': data['avg_effeminate_age'],
            'avg_masculine_age': data['avg_masculine_age'],
            'min_effeminate_age': data.get('min_effeminate_age', 0),
            'max_effeminate_age': data.get('max_effeminate_age', 0),
            'min_masculine_age': data.get('min_masculine_age', 0),
            'max_masculine_age': data.get('max_masculine_age', 0),
            'favorite_rate': data['favorite_rate']
        },
        'most_favorited': [
            {
                'title': scene.title,
                'favorite_count': getattr(scene, 'fav_count', scene.favorite_count),
                'id': scene.id
            } for scene in data['most_favorited']
        ],
        'data_summary': data.get('data_summary', {}),
        'metadata': {
            'chart_limit': chart_limit,
            'total_unique_countries': len(data['country_data']),
            'total_unique_settings': len(data['setting_data']),
            'total_unique_emotions': len(data['emotion_data']),
            'age_range_count': len(data['age_ranges']),
            'dynamic_ranges': True
        }
    }


def get_filtered_analytics_data(filters, chart_limit=10):
    """
    Return flexible filtered analytics data that adapts to any filter combination
    
    Args:
        filters: Dictionary of filter criteria
        chart_limit: Number of items to show in charts (0 = no limit)
    """
    try:
        from django.apps import apps
        Scene = apps.get_model('scenes_app', 'Scene')
        FavoriteScene = apps.get_model('scenes_app', 'FavoriteScene')
        
        # Start with all scenes
        queryset = Scene.objects.all()
        
        # Apply filters dynamically - but only if they're not 'all'
        print(f"DEBUG: Applying filters: {filters}")
        
        if 'country' in filters and filters['country'] and filters['country'] != 'all':
            print(f"DEBUG: Filtering by country: {filters['country']}")
            queryset = queryset.filter(country=filters['country'])
        if 'setting' in filters and filters['setting'] and filters['setting'] != 'all':
            print(f"DEBUG: Filtering by setting: {filters['setting']}")
            queryset = queryset.filter(setting=filters['setting'])
        if 'emotion' in filters and filters['emotion'] and filters['emotion'] != 'all':
            print(f"DEBUG: Filtering by emotion: {filters['emotion']}")
            queryset = queryset.filter(emotion=filters['emotion'])
        
        # Dynamic age range filtering
        if 'ageRange' in filters and filters['ageRange'] and filters['ageRange'] != 'all':
            age_range = filters['ageRange']
            print(f"DEBUG: Filtering by age range: {age_range}")
            if '+' in age_range:
                # Handle ranges like "55+"
                min_age = int(age_range.replace('+', ''))
                queryset = queryset.filter(effeminate_age__gte=min_age)
            elif '-' in age_range:
                # Handle ranges like "18-25"
                min_age, max_age = map(int, age_range.split('-'))
                queryset = queryset.filter(effeminate_age__gte=min_age, effeminate_age__lte=max_age)
        
        # Calculate filtered statistics
        total_scenes = queryset.count()
        print(f"DEBUG: Filtered queryset count: {total_scenes}")
        
        # ALWAYS get ALL filter options, regardless of current filter results
        all_country_data = list(Scene.objects.values('country')
                              .annotate(count=Count('country'))
                              .order_by('-count'))
        
        all_setting_data = list(Scene.objects.values('setting')
                              .annotate(count=Count('setting'))
                              .order_by('-count'))
        
        all_emotion_data = list(Scene.objects.values('emotion')
                              .annotate(count=Count('emotion'))
                              .order_by('-count'))
        
        if total_scenes == 0:
            return {
                'charts': {
                    'countries': {'labels': [], 'data': []},
                    'settings': {'labels': [], 'data': []},
                    'emotions': {'labels': [], 'data': []},
                    'age_ranges': {'labels': [], 'data': []}
                },
                'filters': {
                    'countries': [item['country'] for item in all_country_data],
                    'settings': [item['setting'] for item in all_setting_data],
                    'emotions': [item['emotion'] for item in all_emotion_data]
                },
                'stats': {
                    'total_scenes': 0,
                    'total_favorites': 0,
                    'avg_effeminate_age': 0,
                    'avg_masculine_age': 0,
                    'favorite_rate': 0
                },
                'most_favorited': [],
                'message': 'No scenes match the selected filters',
                'metadata': {
                    'filtered': True,
                    'applied_filters': filters,
                    'chart_limit': chart_limit,
                    'total_unique_countries': len(all_country_data),
                    'total_unique_settings': len(all_setting_data),
                    'total_unique_emotions': len(all_emotion_data)
                }
            }
        
        # Get favorite count for filtered scenes
        scene_ids = list(queryset.values_list('id', flat=True))
        total_favorites = FavoriteScene.objects.filter(scene_id__in=scene_ids).count()
        
        # Age statistics with min/max
        age_stats = queryset.aggregate(
            avg_effeminate_age=Avg('effeminate_age'),
            avg_masculine_age=Avg('masculine_age'),
            min_effeminate_age=Min('effeminate_age'),
            max_effeminate_age=Max('effeminate_age'),
            min_masculine_age=Min('masculine_age'),
            max_masculine_age=Max('masculine_age')
        )
        
        # Distribution data from filtered queryset
        country_data = list(queryset.values('country')
                          .annotate(count=Count('country'))
                          .order_by('-count'))
        
        setting_data = list(queryset.values('setting')
                          .annotate(count=Count('setting'))
                          .order_by('-count'))
        
        emotion_data = list(queryset.values('emotion')
                          .annotate(count=Count('emotion'))
                          .order_by('-count'))
        
        # all_*_data already defined above for consistency
        
        # Dynamic age range distribution for filtered data
        age_ranges = calculate_dynamic_age_ranges(queryset)
        
        # Most favorited scenes in filtered set (flexible limit)
        most_favorited = list(queryset.annotate(
            fav_count=Count('favorites')
        ).filter(fav_count__gt=0).order_by('-fav_count')[:10])
        
        # Flexible chart data formatting
        chart_countries = country_data[:chart_limit] if chart_limit > 0 else country_data
        chart_settings = setting_data[:chart_limit] if chart_limit > 0 else setting_data
        chart_emotions = emotion_data[:chart_limit] if chart_limit > 0 else emotion_data
        
        return {
            'charts': {
                'countries': {
                    'labels': [item['country'] for item in chart_countries],
                    'data': [item['count'] for item in chart_countries]
                },
                'settings': {
                    'labels': [item['setting'] for item in chart_settings],
                    'data': [item['count'] for item in chart_settings]
                },
                'emotions': {
                    'labels': [item['emotion'] for item in chart_emotions],
                    'data': [item['count'] for item in chart_emotions]
                },
                'age_ranges': {
                    'labels': list(age_ranges.keys()),
                    'data': list(age_ranges.values())
                }
            },
            'filters': {
                'countries': [item['country'] for item in all_country_data],
                'settings': [item['setting'] for item in all_setting_data],
                'emotions': [item['emotion'] for item in all_emotion_data]
            },
            'stats': {
                'total_scenes': total_scenes,
                'total_favorites': total_favorites,
                'avg_effeminate_age': round(age_stats['avg_effeminate_age'] or 0, 1),
                'avg_masculine_age': round(age_stats['avg_masculine_age'] or 0, 1),
                'min_effeminate_age': age_stats['min_effeminate_age'] or 0,
                'max_effeminate_age': age_stats['max_effeminate_age'] or 0,
                'min_masculine_age': age_stats['min_masculine_age'] or 0,
                'max_masculine_age': age_stats['max_masculine_age'] or 0,
                'favorite_rate': round((total_favorites / total_scenes) * 100, 1) if total_scenes > 0 else 0
            },
            'most_favorited': [
                {
                    'title': scene.title,
                    'favorite_count': getattr(scene, 'fav_count', scene.favorite_count),
                    'id': scene.id
                } for scene in most_favorited
            ],
            'metadata': {
                'filtered': True,
                'applied_filters': filters,
                'chart_limit': chart_limit,
                'total_unique_countries': len(country_data),
                'total_unique_settings': len(setting_data),
                'total_unique_emotions': len(emotion_data)
            }
        }
        
    except Exception as e:
        return {'error': f'Filtered analytics error: {str(e)}'}