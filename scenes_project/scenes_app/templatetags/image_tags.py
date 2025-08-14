from django import template

register = template.Library()

@register.filter
def image_url(scene_image, size='medium'):
    """Get image URL for specific size"""
    if not scene_image:
        return ''
    
    try:
        # Use the model's get_image_url method if available
        if hasattr(scene_image, 'get_image_url'):
            url = scene_image.get_image_url(size)
            if url:
                return url
        
        # Fallback to direct field access
        size_field_map = {
            'original': 'original_image',
            'large': 'large_image', 
            'medium': 'medium_image',
            'small': 'small_image',
            'thumbnail': 'thumbnail'
        }
        
        field_name = size_field_map.get(size, 'medium_image')
        field = getattr(scene_image, field_name, None)
        
        if field and hasattr(field, 'url'):
            try:
                return field.url
            except:
                pass
        
        # Fallback to original if requested size doesn't exist
        if hasattr(scene_image, 'original_image') and scene_image.original_image:
            try:
                return scene_image.original_image.url
            except:
                pass
                
    except Exception as e:
        print(f"Error in image_url filter: {e}")
    
    return ''