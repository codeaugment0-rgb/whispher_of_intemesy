from typing import Any, Dict
from django.core.paginator import Paginator, Page
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib import messages
from django.shortcuts import get_object_or_404, render, redirect
from django.template.loader import render_to_string
from django.utils import timezone
from django.db.models import Q, Min, Max
from django.db import models
from rest_framework.views import APIView
from rest_framework.response import Response
import random
import json
import os
import sys
from django.conf import settings

from .models import Scene, FavoriteScene, SearchSuggestion, SearchQuery, SceneImage
from .static.py.analytics import analyze_scenes

import logging
logger = logging.getLogger(__name__)


def is_ajax(request: HttpRequest) -> bool:
    return request.headers.get('x-requested-with') == 'XMLHttpRequest'


def scene_list(request: HttpRequest) -> HttpResponse:
    page_number = request.GET.get('page', '1')
    page_size = int(request.GET.get('page_size', '10'))
    random_order = request.GET.get('random', 'false').lower() == 'true'
    favorites_only = request.GET.get('favorites', 'false').lower() == 'true'

    
    # Validate page size
    if page_size not in [10, 25, 50, 100]:
        page_size = 10
    
    # Ensure session exists
    if not request.session.session_key:
        request.session.create()
    
    if favorites_only:
        # Show only favorite scenes for this session
        favorite_scene_ids = FavoriteScene.objects.filter(
            session_key=request.session.session_key
        ).values_list('scene_id', flat=True)
        scenes_qs = Scene.objects.filter(id__in=favorite_scene_ids)
    elif random_order:
        # Get all scene IDs and shuffle them
        scene_ids = list(Scene.objects.values_list('id', flat=True))
        random.shuffle(scene_ids)
        # Create a queryset ordered by the shuffled IDs
        scenes_qs = Scene.objects.filter(id__in=scene_ids).extra(
            select={'ordering': 'CASE ' + ' '.join([f'WHEN id={id} THEN {i}' for i, id in enumerate(scene_ids)]) + ' END'},
            order_by=['ordering']
        )
    else:
        scenes_qs = Scene.objects.all()
    

    
    paginator = Paginator(scenes_qs, page_size)
    
    # Handle invalid page numbers gracefully - redirect to last page if page is too high
    try:
        page_obj: Page = paginator.get_page(page_number)
        # If the requested page is beyond the last page, redirect to the last page
        if int(page_number) > paginator.num_pages and paginator.num_pages > 0:
            page_obj = paginator.get_page(paginator.num_pages)
    except Exception:
        page_obj: Page = paginator.get_page(1)

    # Get user's favorite scene IDs for this session
    user_favorites = set(FavoriteScene.objects.filter(
        session_key=request.session.session_key
    ).values_list('scene_id', flat=True))

    # Calculate pagination range for numbered links
    current_page = page_obj.number
    total_pages = paginator.num_pages
    
    # Smart pagination range calculation
    if total_pages <= 7:
        page_range = range(1, total_pages + 1)
    else:
        if current_page <= 4:
            page_range = list(range(1, 6)) + ['...', total_pages]
        elif current_page >= total_pages - 3:
            page_range = [1, '...'] + list(range(total_pages - 4, total_pages + 1))
        else:
            page_range = [1, '...'] + list(range(current_page - 1, current_page + 2)) + ['...', total_pages]

    context: Dict[str, Any] = {
        'page_obj': page_obj,
        'page_range': page_range,
        'page_size': page_size,
        'random_order': random_order,
        'favorites_only': favorites_only,
        'user_favorites': user_favorites,
        'total_favorites': len(user_favorites),
    }

    # Return JSON for AJAX requests
    if is_ajax(request):
        from django.template.loader import render_to_string
        html = render_to_string('partials/_scene_cards.html', context, request=request)
        pagination_html = render_to_string('partials/_pagination.html', context, request=request)
        return JsonResponse({
            'html': html,
            'pagination_html': pagination_html,
            'current_page': current_page,
            'total_pages': total_pages,
            'total_items': paginator.count,
            'page_size': page_size,
        })

    return render(request, 'scene_list.html', context)


def scene_detail(request: HttpRequest, pk: int) -> HttpResponse:
    scene = get_object_or_404(Scene, pk=pk)
    
    # Ensure session exists
    if not request.session.session_key:
        request.session.create()
    
    # Check if this scene is favorited by the current session
    is_favorited = FavoriteScene.objects.filter(
        scene=scene,
        session_key=request.session.session_key
    ).exists()
    
    context = {
        'scene': scene,
        'is_favorited': is_favorited,
        'favorite_count': scene.favorite_count,
    }
    
    return render(request, 'scene_detail.html', context)


def random_scene(request: HttpRequest) -> HttpResponse:
    """Redirect to a random scene detail page"""
    scene_ids = list(Scene.objects.values_list('id', flat=True))
    if not scene_ids:
        return render(request, 'scene_list.html', {'page_obj': None, 'error': 'No scenes available'})
    
    random_id = random.choice(scene_ids)
    return redirect('scene_detail', pk=random_id)


def add_scene(request: HttpRequest) -> HttpResponse:
    if request.method == 'POST':
        try:
            title = request.POST.get('title')
            effeminate_age = request.POST.get('effeminate_age')
            masculine_age = request.POST.get('masculine_age')
            country = request.POST.get('country')
            setting = request.POST.get('setting')
            emotion = request.POST.get('emotion')
            effeminate_appearance = request.POST.get('effeminate_appearance')
            effeminate_hair = request.POST.get('effeminate_hair')
            effeminate_clothing = request.POST.get('effeminate_clothing')
            masculine_appearance = request.POST.get('masculine_appearance')
            masculine_hair = request.POST.get('masculine_hair')
            masculine_clothing = request.POST.get('masculine_clothing')
            atmosphere_lighting = request.POST.get('atmosphere_lighting')
            atmosphere_scent = request.POST.get('atmosphere_scent')
            atmosphere_sound = request.POST.get('atmosphere_sound')
            full_text = request.POST.get('full_text')

            # Validate all fields
            required_fields = [
                title, effeminate_age, masculine_age, country, setting, emotion,
                effeminate_appearance, effeminate_hair, effeminate_clothing,
                masculine_appearance, masculine_hair, masculine_clothing,
                atmosphere_lighting, atmosphere_scent, atmosphere_sound, full_text
            ]
            if not all(required_fields):
                missing_fields = [field for field, value in [
                    ('title', title), ('effeminate_age', effeminate_age), ('masculine_age', masculine_age),
                    ('country', country), ('setting', setting), ('emotion', emotion),
                    ('effeminate_appearance', effeminate_appearance), ('effeminate_hair', effeminate_hair),
                    ('effeminate_clothing', effeminate_clothing), ('masculine_appearance', masculine_appearance),
                    ('masculine_hair', masculine_hair), ('masculine_clothing', masculine_clothing),
                    ('atmosphere_lighting', atmosphere_lighting), ('atmosphere_scent', atmosphere_scent),
                    ('atmosphere_sound', atmosphere_sound), ('full_text', full_text)
                ] if not value]
                return JsonResponse({'status': 'error', 'message': f'Missing fields: {", ".join(missing_fields)}'}, status=400)

            # Convert ages to integers
            try:
                effeminate_age = int(effeminate_age)
                masculine_age = int(masculine_age)
            except ValueError:
                return JsonResponse({'status': 'error', 'message': 'Ages must be valid numbers'}, status=400)

            # Save to database
            scene = Scene.objects.create(
                title=title,
                effeminate_age=effeminate_age,
                masculine_age=masculine_age,
                country=country,
                setting=setting,
                emotion=emotion,
                details={
                    'effeminate': {
                        'appearance': effeminate_appearance,
                        'hair': effeminate_hair,
                        'clothing': effeminate_clothing
                    },
                    'masculine': {
                        'appearance': masculine_appearance,
                        'hair': masculine_hair,
                        'clothing': masculine_clothing
                    },
                    'atmosphere': {
                        'lighting': atmosphere_lighting,
                        'scent': atmosphere_scent,
                        'sound': atmosphere_sound
                    }
                },
                full_text=full_text
            )

            # Save to JSON file
            json_file_path = os.path.join(settings.BASE_DIR, 'scenes.json')
            try:
                with open(json_file_path, 'r+') as file:
                    existing_data = json.load(file)
                    existing_data.append({
                        'title': title,
                        'effeminateAge': effeminate_age,
                        'masculineAge': masculine_age,
                        'country': country,
                        'setting': setting,
                        'emotion': emotion,
                        'details': {
                            'effeminate': {
                                'appearance': effeminate_appearance,
                                'hair': effeminate_hair,
                                'clothing': effeminate_clothing
                            },
                            'masculine': {
                                'appearance': masculine_appearance,
                                'hair': masculine_hair,
                                'clothing': masculine_clothing
                            },
                            'atmosphere': {
                                'lighting': atmosphere_lighting,
                                'scent': atmosphere_scent,
                                'sound': atmosphere_sound
                            }
                        },
                        'fullText': full_text
                    })
                    file.seek(0)
                    json.dump(existing_data, file, indent=2)
            except FileNotFoundError:
                with open(json_file_path, 'w') as file:
                    json.dump([{
                        'title': title,
                        'effeminateAge': effeminate_age,
                        'masculineAge': masculine_age,
                        'country': country,
                        'setting': setting,
                        'emotion': emotion,
                        'details': {
                            'effeminate': {
                                'appearance': effeminate_appearance,
                                'hair': effeminate_hair,
                                'clothing': effeminate_clothing
                            },
                            'masculine': {
                                'appearance': masculine_appearance,
                                'hair': masculine_hair,
                                'clothing': masculine_clothing
                            },
                            'atmosphere': {
                                'lighting': atmosphere_lighting,
                                'scent': atmosphere_scent,
                                'sound': atmosphere_sound
                            }
                        },
                        'fullText': full_text
                    }], file, indent=2)
            except Exception as e:
                return JsonResponse({'status': 'error', 'message': f'JSON file error: {str(e)}'}, status=500)

            return JsonResponse({'status': 'success'}, status=200)

        except Exception as e:
            return JsonResponse({'status': 'error', 'message': f'Server error: {str(e)}'}, status=500)

    return render(request, 'add_scene.html')


def analytics(request: HttpRequest) -> HttpResponse:
    try:
        analytics_data = analyze_scenes()
        if analytics_data.get('error'):
            raise Exception(analytics_data['error'])
        return render(request, 'analytics.html', analytics_data)
    except Exception as e:
        return render(request, 'analytics.html', {'error': str(e)})


def analytics_api(request: HttpRequest) -> JsonResponse:
    """Flexible API endpoint for analytics data with optional filtering and limits"""
    try:
        from .static.py.analytics import get_analytics_api_data, get_filtered_analytics_data
        
        # Get flexible parameters - Default to 0 (no limit) to show ALL data
        chart_limit = int(request.GET.get('chart_limit', 0))  # Default to 0 = show ALL data
        
        # Check if any filters are applied
        filters = {}
        for param in ['country', 'setting', 'emotion', 'ageRange']:
            value = request.GET.get(param)
            if value and value != 'all':
                filters[param] = value
        
        # Additional flexible filters
        if request.GET.get('min_age'):
            try:
                filters['min_age'] = int(request.GET.get('min_age'))
            except ValueError:
                pass
                
        if request.GET.get('max_age'):
            try:
                filters['max_age'] = int(request.GET.get('max_age'))
            except ValueError:
                pass
        
        # Get analytics data
        if filters:
            analytics_data = get_filtered_analytics_data(filters, chart_limit)
        else:
            analytics_data = get_analytics_api_data(chart_limit)
        
        # Add request metadata
        analytics_data['request_info'] = {
            'filters_applied': len(filters),
            'chart_limit': chart_limit,
            'timestamp': timezone.now().isoformat(),
            'total_params': len(request.GET)
        }
            
        return JsonResponse(analytics_data)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


class ScenePromptAPIView(APIView):
    def get(self, request: HttpRequest, pk: int):
        scene = get_object_or_404(Scene, pk=pk)
        return Response({'full_text': scene.full_text})


class RandomSceneAPIView(APIView):
    def get(self, request: HttpRequest):
        """Get a random scene via API"""
        scene_ids = list(Scene.objects.values_list('id', flat=True))
        if not scene_ids:
            return Response({'error': 'No scenes available'}, status=404)
        
        random_id = random.choice(scene_ids)
        scene = Scene.objects.get(id=random_id)
        
        return Response({
            'id': scene.id,
            'title': scene.title,
            'effeminate_age': scene.effeminate_age,
            'masculine_age': scene.masculine_age,
            'country': scene.country,
            'setting': scene.setting,
            'emotion': scene.emotion,
            'details': scene.details,
            'full_text': scene.full_text
        })


def toggle_favorite(request: HttpRequest, pk: int) -> JsonResponse:
    """Toggle favorite status for a scene"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    scene = get_object_or_404(Scene, pk=pk)
    
    # Ensure session exists
    if not request.session.session_key:
        request.session.create()
    
    favorite, created = FavoriteScene.objects.get_or_create(
        scene=scene,
        session_key=request.session.session_key
    )
    
    if not created:
        # Already exists, so remove it
        favorite.delete()
        is_favorited = False
        action = 'removed'
    else:
        # Just created, so it's now favorited
        is_favorited = True
        action = 'added'
    
    return JsonResponse({
        'success': True,
        'is_favorited': is_favorited,
        'action': action,
        'favorite_count': scene.favorite_count,
        'message': f'Scene {action} {"to" if action == "added" else "from"} favorites'
    })


def debug_api(request: HttpRequest) -> JsonResponse:
    """Debug API to check data counts and sync status"""
    try:
        from .static.py.analytics import check_data_sync
        from .models import Scene, FavoriteScene
        
        sync_info = check_data_sync()
        
        # Get sample data
        countries = list(Scene.objects.values_list('country', flat=True).distinct())
        settings = list(Scene.objects.values_list('setting', flat=True).distinct())
        emotions = list(Scene.objects.values_list('emotion', flat=True).distinct())
        
        return JsonResponse({
            'database_count': Scene.objects.count(),
            'favorites_count': FavoriteScene.objects.count(),
            'sync_info': sync_info,
            'unique_countries': len(countries),
            'unique_settings': len(settings),
            'unique_emotions': len(emotions),
            'sample_countries': countries[:10],
            'sample_settings': settings[:10],
            'sample_emotions': emotions[:10],
            'timestamp': timezone.now().isoformat()
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def edit_scene(request: HttpRequest, pk: int) -> HttpResponse:
    """Edit an existing scene"""
    scene = get_object_or_404(Scene, pk=pk)
    
    if request.method == 'POST':
        try:
            # Update scene fields
            scene.title = request.POST.get('title', scene.title)
            scene.effeminate_age = int(request.POST.get('effeminate_age', scene.effeminate_age))
            scene.masculine_age = int(request.POST.get('masculine_age', scene.masculine_age))
            scene.country = request.POST.get('country', scene.country)
            scene.setting = request.POST.get('setting', scene.setting)
            scene.emotion = request.POST.get('emotion', scene.emotion)
            scene.full_text = request.POST.get('full_text', scene.full_text)
            
            # Update details
            details = scene.details or {}
            details.update({
                'effeminate': {
                    'appearance': request.POST.get('effeminate_appearance', ''),
                    'hair': request.POST.get('effeminate_hair', ''),
                    'clothing': request.POST.get('effeminate_clothing', '')
                },
                'masculine': {
                    'appearance': request.POST.get('masculine_appearance', ''),
                    'hair': request.POST.get('masculine_hair', ''),
                    'clothing': request.POST.get('masculine_clothing', '')
                },
                'atmosphere': {
                    'lighting': request.POST.get('atmosphere_lighting', ''),
                    'scent': request.POST.get('atmosphere_scent', ''),
                    'sound': request.POST.get('atmosphere_sound', '')
                }
            })
            scene.details = details
            scene.save()
            
            return JsonResponse({'status': 'success', 'message': 'Scene updated successfully'})
            
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    
    context = {
        'scene': scene,
        'is_edit': True
    }
    return render(request, 'edit_scene.html', context)


def delete_scene(request: HttpRequest, pk: int) -> HttpResponse:
    """Delete a scene (confirmation page)"""
    scene = get_object_or_404(Scene, pk=pk)
    
    if request.method == 'POST':
        scene.delete()
        return redirect('scene_list')
    
    context = {'scene': scene}
    return render(request, 'delete_scene.html', context)



def update_scene_api(request: HttpRequest, pk: int) -> JsonResponse:
    """API endpoint to update a scene"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    scene = get_object_or_404(Scene, pk=pk)
    
    try:
        import json
        data = json.loads(request.body)
        
        # Update fields
        for field in ['title', 'country', 'setting', 'emotion', 'full_text']:
            if field in data:
                setattr(scene, field, data[field])
        
        if 'effeminate_age' in data:
            scene.effeminate_age = int(data['effeminate_age'])
        if 'masculine_age' in data:
            scene.masculine_age = int(data['masculine_age'])
        
        if 'details' in data:
            scene.details = data['details']
        
        scene.save()
        
        return JsonResponse({
            'status': 'success',
            'message': 'Scene updated successfully',
            'scene': {
                'id': scene.id,
                'title': scene.title,
                'country': scene.country,
                'setting': scene.setting,
                'emotion': scene.emotion
            }
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


def delete_scene_api(request: HttpRequest, pk: int) -> JsonResponse:
    """API endpoint to delete a scene"""
    if request.method != 'DELETE':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    scene = get_object_or_404(Scene, pk=pk)
    scene_title = scene.title
    scene.delete()
    
    return JsonResponse({
        'status': 'success',
        'message': f'Scene "{scene_title}" deleted successfully'
    })


def pagination_api(request: HttpRequest) -> JsonResponse:
    """API endpoint for pagination data and quick navigation"""
    try:
        page_number = request.GET.get('page', '1')
        page_size = int(request.GET.get('page_size', '10'))
        random_order = request.GET.get('random', 'false').lower() == 'true'
        favorites_only = request.GET.get('favorites', 'false').lower() == 'true'

        
        # Validate page size
        if page_size not in [10, 25, 50, 100]:
            page_size = 10
        
        # Ensure session exists
        if not request.session.session_key:
            request.session.create()
        
        if favorites_only:
            # Show only favorite scenes for this session
            favorite_scene_ids = FavoriteScene.objects.filter(
                session_key=request.session.session_key
            ).values_list('scene_id', flat=True)
            scenes_qs = Scene.objects.filter(id__in=favorite_scene_ids)
        elif random_order:
            # Get all scene IDs and shuffle them
            scene_ids = list(Scene.objects.values_list('id', flat=True))
            random.shuffle(scene_ids)
            # Create a queryset ordered by the shuffled IDs
            scenes_qs = Scene.objects.filter(id__in=scene_ids).extra(
                select={'ordering': 'CASE ' + ' '.join([f'WHEN id={id} THEN {i}' for i, id in enumerate(scene_ids)]) + ' END'},
                order_by=['ordering']
            )
        else:
            scenes_qs = Scene.objects.all()
        

        
        paginator = Paginator(scenes_qs, page_size)
        
        # Handle invalid page numbers gracefully
        try:
            page_obj: Page = paginator.get_page(page_number)
        except Exception:
            page_obj: Page = paginator.get_page(1)

        # Calculate pagination range for numbered links
        current_page = page_obj.number
        total_pages = paginator.num_pages
        
        # Smart pagination range calculation
        if total_pages <= 7:
            page_range = list(range(1, total_pages + 1))
        else:
            if current_page <= 4:
                page_range = list(range(1, 6)) + ['...', total_pages]
            elif current_page >= total_pages - 3:
                page_range = [1, '...'] + list(range(total_pages - 4, total_pages + 1))
            else:
                page_range = [1, '...'] + list(range(current_page - 1, current_page + 2)) + ['...', total_pages]

        return JsonResponse({
            'success': True,
            'current_page': current_page,
            'total_pages': total_pages,
            'total_items': paginator.count,
            'page_size': page_size,
            'page_range': page_range,
            'has_previous': page_obj.has_previous,
            'has_next': page_obj.has_next,
            'previous_page_number': page_obj.previous_page_number if page_obj.has_previous else None,
            'next_page_number': page_obj.next_page_number if page_obj.has_next else None,
            'start_index': page_obj.start_index,
            'end_index': page_obj.end_index,

        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)











def favorites_list(request: HttpRequest) -> HttpResponse:
    """Show user's favorite scenes"""
    # Ensure session exists
    if not request.session.session_key:
        request.session.create()
    
    page_number = request.GET.get('page', '1')
    page_size = int(request.GET.get('page_size', '10'))
    
    # Validate page size
    if page_size not in [10, 25, 50, 100]:
        page_size = 10
    
    # Get favorite scenes for this session
    favorite_scene_ids = FavoriteScene.objects.filter(
        session_key=request.session.session_key
    ).values_list('scene_id', flat=True)
    
    scenes_qs = Scene.objects.filter(id__in=favorite_scene_ids).order_by('-id')
    
    paginator = Paginator(scenes_qs, page_size)
    
    # Handle invalid page numbers gracefully
    try:
        page_obj: Page = paginator.get_page(page_number)
    except Exception:
        page_obj: Page = paginator.get_page(1)

    # Get user's favorite scene IDs for this session
    user_favorites = set(favorite_scene_ids)

    # Calculate pagination range for numbered links
    current_page = page_obj.number
    total_pages = paginator.num_pages
    
    # Smart pagination range calculation
    if total_pages <= 7:
        page_range = range(1, total_pages + 1)
    else:
        if current_page <= 4:
            page_range = list(range(1, 6)) + ['...', total_pages]
        elif current_page >= total_pages - 3:
            page_range = [1, '...'] + list(range(total_pages - 4, total_pages + 1))
        else:
            page_range = [1, '...'] + list(range(current_page - 1, current_page + 2)) + ['...', total_pages]

    context: Dict[str, Any] = {
        'page_obj': page_obj,
        'page_range': page_range,
        'page_size': page_size,
        'user_favorites': user_favorites,
        'total_favorites': len(user_favorites),
        'is_favorites_page': True,
        'favorites_only': True,
    }

    # Return JSON for AJAX requests
    if is_ajax(request):
        from django.template.loader import render_to_string
        html = render_to_string('partials/_scene_cards.html', context, request=request)
        pagination_html = render_to_string('partials/_pagination.html', context, request=request)
        return JsonResponse({
            'html': html,
            'pagination_html': pagination_html,
            'current_page': current_page,
            'total_pages': total_pages,
            'total_items': paginator.count,
            'page_size': page_size,
        })

    return render(request, 'favorites_list.html', context)


def search_results(request: HttpRequest) -> HttpResponse:
    """Simple search results page"""
    query = request.GET.get('q', '').strip()
    page_number = request.GET.get('page', '1')
    page_size = int(request.GET.get('page_size', '10'))

    # Validate page size
    if page_size not in [10, 25, 50, 100]:
        page_size = 10

    # Start with all scenes
    scenes_qs = Scene.objects.all()

    # Apply search query if provided
    if query:
        # Search in multiple fields
        scenes_qs = scenes_qs.filter(
            Q(title__icontains=query) |
            Q(country__icontains=query) |
            Q(setting__icontains=query) |
            Q(emotion__icontains=query) |
            Q(full_text__icontains=query)
        )

    # Order by most recent first
    scenes_qs = scenes_qs.order_by('-id')

    # Pagination
    paginator = Paginator(scenes_qs, page_size)
    try:
        page_obj = paginator.get_page(page_number)
    except:
        page_obj = paginator.get_page(1)

    # Smart pagination range calculation (same as home page)
    current_page = page_obj.number
    total_pages = paginator.num_pages

    if total_pages <= 7:
        page_range = range(1, total_pages + 1)
    else:
        if current_page <= 4:
            page_range = list(range(1, 6)) + ['...', total_pages]
        elif current_page >= total_pages - 3:
            page_range = [1, '...'] + list(range(total_pages - 4, total_pages + 1))
        else:
            page_range = [1, '...'] + list(range(current_page - 1, current_page + 2)) + ['...', total_pages]

    # Get favorites for current session
    if not request.session.session_key:
        request.session.create()

    favorite_scene_ids = list(
        FavoriteScene.objects.filter(
            session_key=request.session.session_key
        ).values_list('scene_id', flat=True)
    )

    context = {
        'page_obj': page_obj,
        'page_range': page_range,
        'query': query,
        'page_size': page_size,
        'favorite_scene_ids': favorite_scene_ids,
        'total_results': paginator.count,
    }

    # Handle AJAX requests for pagination (same as home page)
    if is_ajax(request):
        current_page = page_obj.number
        total_pages = paginator.num_pages

        # Render the regular scene cards partial
        html = render_to_string('partials/_scene_cards.html', context, request=request)

        # Render pagination
        pagination_html = render_to_string('partials/_pagination.html', context, request=request)

        return JsonResponse({
            'html': html,
            'pagination_html': pagination_html,
            'current_page': current_page,
            'total_pages': total_pages,
            'total_items': paginator.count,
            'page_size': page_size,
        })

    return render(request, 'search_results.html', context)


def search_suggestions_api(request: HttpRequest) -> JsonResponse:
    """API endpoint for search suggestions and autocomplete"""
    query = request.GET.get('q', '').strip()
    suggestion_type = request.GET.get('type', '')  # title, country, setting, emotion, content, character
    limit = int(request.GET.get('limit', '10'))

    if not query or len(query) < 2:
        return JsonResponse({'suggestions': []})

    try:
        # Get suggestions from the model
        suggestions = SearchSuggestion.get_suggestions(query, suggestion_type, limit)

        # Format suggestions
        suggestion_list = []
        for suggestion in suggestions:
            suggestion_list.append({
                'term': suggestion.term,
                'type': suggestion.suggestion_type,
                'frequency': suggestion.frequency,
                'display': suggestion.term.title() if suggestion.suggestion_type in ['country', 'setting', 'emotion'] else suggestion.term
            })

        # If we don't have enough suggestions, add some from actual scene data
        if len(suggestion_list) < limit:
            remaining_limit = limit - len(suggestion_list)
            existing_terms = {s['term'].lower() for s in suggestion_list}

            # Search in actual scene data
            additional_suggestions = []

            if not suggestion_type or suggestion_type == 'title':
                titles = Scene.objects.filter(title__icontains=query).values_list('title', flat=True)[:remaining_limit]
                for title in titles:
                    if title.lower() not in existing_terms:
                        additional_suggestions.append({
                            'term': title,
                            'type': 'title',
                            'frequency': 1,
                            'display': title
                        })
                        existing_terms.add(title.lower())

            if not suggestion_type or suggestion_type == 'country':
                countries = Scene.objects.filter(country__icontains=query).values_list('country', flat=True).distinct()[:remaining_limit]
                for country in countries:
                    if country.lower() not in existing_terms:
                        additional_suggestions.append({
                            'term': country,
                            'type': 'country',
                            'frequency': 1,
                            'display': country
                        })
                        existing_terms.add(country.lower())

            if not suggestion_type or suggestion_type == 'setting':
                settings = Scene.objects.filter(setting__icontains=query).values_list('setting', flat=True).distinct()[:remaining_limit]
                for setting in settings:
                    if setting.lower() not in existing_terms:
                        additional_suggestions.append({
                            'term': setting,
                            'type': 'setting',
                            'frequency': 1,
                            'display': setting
                        })
                        existing_terms.add(setting.lower())

            if not suggestion_type or suggestion_type == 'emotion':
                emotions = Scene.objects.filter(emotion__icontains=query).values_list('emotion', flat=True).distinct()[:remaining_limit]
                for emotion in emotions:
                    if emotion.lower() not in existing_terms:
                        additional_suggestions.append({
                            'term': emotion,
                            'type': 'emotion',
                            'frequency': 1,
                            'display': emotion
                        })
                        existing_terms.add(emotion.lower())

            suggestion_list.extend(additional_suggestions[:remaining_limit])

        return JsonResponse({
            'suggestions': suggestion_list[:limit],
            'query': query,
            'count': len(suggestion_list[:limit])
        })

    except Exception as e:
        return JsonResponse({'error': str(e), 'suggestions': []}, status=500)


def search_api(request: HttpRequest) -> JsonResponse:
    """API endpoint for search results"""
    query = request.GET.get('q', '').strip()
    country = request.GET.get('country', '')
    setting = request.GET.get('setting', '')
    emotion = request.GET.get('emotion', '')
    min_age = request.GET.get('min_age', '')
    max_age = request.GET.get('max_age', '')
    page = int(request.GET.get('page', '1'))
    page_size = int(request.GET.get('page_size', '12'))

    # Validate page size
    if page_size not in [12, 24, 48, 96]:
        page_size = 12

    try:
        # Start with all scenes
        scenes_qs = Scene.objects.all()

        # Apply text search
        if query:
            scenes_qs = scenes_qs.filter(
                Q(title__icontains=query) |
                Q(full_text__icontains=query) |
                Q(country__icontains=query) |
                Q(setting__icontains=query) |
                Q(emotion__icontains=query) |
                Q(details__effeminate__appearance__icontains=query) |
                Q(details__masculine__appearance__icontains=query) |
                Q(details__atmosphere__lighting__icontains=query) |
                Q(details__atmosphere__scent__icontains=query) |
                Q(details__atmosphere__sound__icontains=query)
            )

        # Apply filters
        if country and country != 'all':
            scenes_qs = scenes_qs.filter(country__iexact=country)

        if setting and setting != 'all':
            scenes_qs = scenes_qs.filter(setting__iexact=setting)

        if emotion and emotion != 'all':
            scenes_qs = scenes_qs.filter(emotion__iexact=emotion)

        # Apply age filters
        if min_age:
            try:
                min_age_int = int(min_age)
                scenes_qs = scenes_qs.filter(
                    Q(effeminate_age__gte=min_age_int) | Q(masculine_age__gte=min_age_int)
                )
            except ValueError:
                pass

        if max_age:
            try:
                max_age_int = int(max_age)
                scenes_qs = scenes_qs.filter(
                    Q(effeminate_age__lte=max_age_int) | Q(masculine_age__lte=max_age_int)
                )
            except ValueError:
                pass

        # Order by relevance
        if query:
            # For now, just order by ID - we can add relevance scoring later
            scenes_qs = scenes_qs.order_by('id')
        else:
            scenes_qs = scenes_qs.order_by('-id')

        # Pagination
        paginator = Paginator(scenes_qs, page_size)
        try:
            page_obj = paginator.get_page(page)
        except:
            page_obj = paginator.get_page(1)

        # Serialize results
        results = []
        for scene in page_obj.object_list:
            results.append({
                'id': scene.id,
                'title': scene.title,
                'effeminate_age': scene.effeminate_age,
                'masculine_age': scene.masculine_age,
                'country': scene.country,
                'setting': scene.setting,
                'emotion': scene.emotion,
                'details': scene.details,
                'favorite_count': scene.favorite_count,
            })

        return JsonResponse({
            'results': results,
            'pagination': {
                'current_page': page_obj.number,
                'total_pages': paginator.num_pages,
                'total_results': paginator.count,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous(),
                'page_size': page_size,
            },
            'query': query,
            'filters': {
                'country': country,
                'setting': setting,
                'emotion': emotion,
                'min_age': min_age,
                'max_age': max_age,
            }
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# Image Upload Views
@csrf_exempt
@require_http_methods(["POST"])
def upload_scene_images(request: HttpRequest, pk: int) -> JsonResponse:
    """Handle multiple image uploads for a scene"""
    scene = get_object_or_404(Scene, pk=pk)
    
    if not request.FILES:
        return JsonResponse({'error': 'No files uploaded'}, status=400)
    
    uploaded_images = []
    errors = []
    
    # Get the highest order number for existing images
    max_order = scene.scene_images.aggregate(models.Max('order'))['order__max'] or 0
    
    for file_key in request.FILES:
        files = request.FILES.getlist(file_key)
        
        for uploaded_file in files:
            try:
                # Validate file type
                if not uploaded_file.content_type.startswith('image/'):
                    errors.append(f'{uploaded_file.name}: Not a valid image file')
                    continue
                
                # Validate file size (max 10MB)
                if uploaded_file.size > 10 * 1024 * 1024:
                    errors.append(f'{uploaded_file.name}: File too large (max 10MB)')
                    continue
                
                # Create SceneImage instance
                max_order += 1
                scene_image = SceneImage(
                    scene=scene,
                    image=uploaded_file,
                    order=max_order
                )
                scene_image.save()
                
                uploaded_images.append({
                    'id': scene_image.id,
                    'url': scene_image.image.url,
                    'thumbnail_url': scene_image.thumbnail.url if scene_image.thumbnail else scene_image.image.url,
                    'filename': uploaded_file.name,
                    'size': scene_image.file_size_human,
                    'dimensions': f"{scene_image.width}x{scene_image.height}",
                    'order': scene_image.order
                })
                
            except Exception as e:
                errors.append(f'{uploaded_file.name}: {str(e)}')
    
    response_data = {
        'success': len(uploaded_images) > 0,
        'uploaded_images': uploaded_images,
        'total_uploaded': len(uploaded_images),
        'errors': errors
    }
    
    if errors and not uploaded_images:
        return JsonResponse(response_data, status=400)
    
    return JsonResponse(response_data)


@require_http_methods(["DELETE"])
def delete_scene_image(request: HttpRequest, pk: int, image_id: int) -> JsonResponse:
    """Delete a specific scene image"""
    scene = get_object_or_404(Scene, pk=pk)
    scene_image = get_object_or_404(SceneImage, id=image_id, scene=scene)
    
    try:
        scene_image.delete()
        return JsonResponse({
            'success': True,
            'message': 'Image deleted successfully'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@require_http_methods(["POST"])
def update_image_order(request: HttpRequest, pk: int) -> JsonResponse:
    """Update the order of scene images"""
    scene = get_object_or_404(Scene, pk=pk)
    
    try:
        import json
        data = json.loads(request.body)
        image_orders = data.get('image_orders', [])
        
        for item in image_orders:
            image_id = item.get('id')
            new_order = item.get('order')
            
            if image_id and new_order is not None:
                SceneImage.objects.filter(
                    id=image_id, 
                    scene=scene
                ).update(order=new_order)
        
        return JsonResponse({
            'success': True,
            'message': 'Image order updated successfully'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@require_http_methods(["POST"])
def update_image_caption(request: HttpRequest, pk: int, image_id: int) -> JsonResponse:
    """Update image caption"""
    scene = get_object_or_404(Scene, pk=pk)
    scene_image = get_object_or_404(SceneImage, id=image_id, scene=scene)
    
    try:
        import json
        data = json.loads(request.body)
        caption = data.get('caption', '').strip()
        
        scene_image.caption = caption
        scene_image.save(update_fields=['caption'])
        
        return JsonResponse({
            'success': True,
            'message': 'Caption updated successfully',
            'caption': caption
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

def search_suggestions_api(request: HttpRequest) -> JsonResponse:
    """API endpoint for search suggestions"""
    try:
        query = request.GET.get('q', '').strip()
        suggestion_type = request.GET.get('type', None)
        limit = int(request.GET.get('limit', 10))
        
        if not query or len(query) < 2:
            return JsonResponse({'suggestions': []})
        
        suggestions = SearchSuggestion.get_suggestions(query, suggestion_type, limit)
        
        suggestions_data = [{
            'term': s.term,
            'type': s.suggestion_type,
            'frequency': s.frequency
        } for s in suggestions]
        
        return JsonResponse({
            'suggestions': suggestions_data,
            'query': query,
            'type': suggestion_type
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def search_api(request: HttpRequest) -> JsonResponse:
    """API endpoint for search functionality"""
    try:
        query = request.GET.get('q', '').strip()
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 10))
        
        # Validate page size
        if page_size not in [10, 25, 50, 100]:
            page_size = 10
        
        # Record search query
        if query and request.session.session_key:
            SearchQuery.objects.create(
                query=query,
                session_key=request.session.session_key,
                results_count=0  # Will be updated below
            )
        
        # Start with all scenes
        scenes_qs = Scene.objects.all()
        
        # Apply search query if provided
        if query:
            scenes_qs = scenes_qs.filter(
                Q(title__icontains=query) |
                Q(country__icontains=query) |
                Q(setting__icontains=query) |
                Q(emotion__icontains=query) |
                Q(full_text__icontains=query)
            )
            
            # Update search suggestions
            SearchSuggestion.add_or_update_suggestion(query, 'content')
        
        # Order by most recent first
        scenes_qs = scenes_qs.order_by('-id')
        
        # Pagination
        paginator = Paginator(scenes_qs, page_size)
        page_obj = paginator.get_page(page)
        
        # Update search query results count
        if query and request.session.session_key:
            SearchQuery.objects.filter(
                query=query,
                session_key=request.session.session_key
            ).update(results_count=paginator.count)
        
        # Serialize scenes
        scenes_data = []
        for scene in page_obj:
            scenes_data.append({
                'id': scene.id,
                'title': scene.title,
                'country': scene.country,
                'setting': scene.setting,
                'emotion': scene.emotion,
                'effeminate_age': scene.effeminate_age,
                'masculine_age': scene.masculine_age,
                'favorite_count': scene.favorite_count
            })
        
        return JsonResponse({
            'scenes': scenes_data,
            'pagination': {
                'current_page': page_obj.number,
                'total_pages': paginator.num_pages,
                'total_items': paginator.count,
                'has_previous': page_obj.has_previous,
                'has_next': page_obj.has_next,
                'page_size': page_size
            },
            'query': query
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def bulk_delete_images(request: HttpRequest, pk: int) -> JsonResponse:
    """Handle bulk deletion of scene images"""
    scene = get_object_or_404(Scene, pk=pk)
    
    try:
        import json
        data = json.loads(request.body)
        image_ids = data.get('image_ids', [])
        
        if not image_ids:
            return JsonResponse({'error': 'No images selected'}, status=400)
        
        # Get images that belong to this scene
        images_to_delete = SceneImage.objects.filter(
            id__in=image_ids, 
            scene=scene
        )
        
        deleted_count = images_to_delete.count()
        
        # Delete the images
        for image in images_to_delete:
            image.delete()  # This will also delete the files
        
        return JsonResponse({
            'success': True,
            'deleted_count': deleted_count,
            'message': f'Successfully deleted {deleted_count} image(s)'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)