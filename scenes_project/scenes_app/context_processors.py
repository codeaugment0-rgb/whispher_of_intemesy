from .models import FavoriteScene


def favorites_context(request):
    """Add favorites count to all templates"""
    if not request.session.session_key:
        return {'total_favorites': 0}
    
    total_favorites = FavoriteScene.objects.filter(
        session_key=request.session.session_key
    ).count()
    
    return {'total_favorites': total_favorites}