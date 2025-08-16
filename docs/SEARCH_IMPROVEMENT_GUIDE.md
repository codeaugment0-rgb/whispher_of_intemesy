# Search Results and Autocomplete Improvement Guide

## EXACT CODE CHANGES - WHAT TO REMOVE AND WHAT TO ADD

### 1. File: `scenes_project/scenes_app/views.py`

#### STEP 1: ADD IMPORTS (at the top of the file)
**FIND THIS LINE:**
```python
from django.db.models import Q, Min, Max
```

**REPLACE WITH:**
```python
from django.db.models import Q, Min, Max, Case, When, IntegerField, Value, F, Count, Avg
```

#### STEP 2: ADD NEW FUNCTIONS (after the `is_ajax` function)
**ADD THESE TWO FUNCTIONS AFTER:**
```python
def is_ajax(request: HttpRequest) -> bool:
    return request.headers.get('x-requested-with') == 'XMLHttpRequest'
```

**ADD THIS CODE:**
```python
def enhanced_search(query_string, queryset=None):
    """Enhanced search with weighted scoring"""
    if not queryset:
        queryset = Scene.objects.all()
    
    if not query_string.strip():
        return queryset
    
    # Create search weights for different fields
    search_results = queryset.annotate(
        # Title matches get highest weight
        title_match=Case(
            When(title__icontains=query_string, then=Value(10)),
            default=Value(0),
            output_field=IntegerField()
        ),
        # Country matches get medium weight
        country_match=Case(
            When(country__icontains=query_string, then=Value(5)),
            default=Value(0),
            output_field=IntegerField()
        ),
        # Setting matches get medium weight
        setting_match=Case(
            When(setting__icontains=query_string, then=Value(5)),
            default=Value(0),
            output_field=IntegerField()
        ),
        # Emotion matches get medium weight
        emotion_match=Case(
            When(emotion__icontains=query_string, then=Value(3)),
            default=Value(0),
            output_field=IntegerField()
        ),
        # Full text matches get lower weight
        fulltext_match=Case(
            When(full_text__icontains=query_string, then=Value(1)),
            default=Value(0),
            output_field=IntegerField()
        ),
        # Calculate total relevance score
        relevance_score=F('title_match') + F('country_match') + F('setting_match') + F('emotion_match') + F('fulltext_match')
    ).filter(
        Q(title__icontains=query_string) |
        Q(country__icontains=query_string) |
        Q(setting__icontains=query_string) |
        Q(emotion__icontains=query_string) |
        Q(full_text__icontains=query_string)
    ).filter(relevance_score__gt=0).order_by('-relevance_score', '-id')
    
    return search_results

def track_search(request, query, results_count):
    """Track search queries for analytics"""
    if not request.session.session_key:
        request.session.create()
        
    try:
        SearchQuery.objects.create(
            query=query,
            session_key=request.session.session_key,
            results_count=results_count,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]  # Limit length
        )
    except:
        pass  # In case SearchQuery model doesn't exist yet
```

#### STEP 3: FIND AND COMPLETELY REPLACE THE SEARCH_RESULTS FUNCTION

**FIND THIS ENTIRE FUNCTION (DELETE ALL OF IT):**
```python
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

    # Get pagination
    paginator = Paginator(scenes_qs, page_size)
    try:
        page_obj = paginator.get_page(page_number)
        # Handle invalid page number - Redirect to last page
        if int(page_number) > paginator.num_pages and paginator.num_pages > 0:
            page_obj = paginator.get_page(paginator.num_pages)
    except Exception:
        page_obj = paginator.get_page(1)

    # Get user's favorite scene IDs for this session
    if not request.session.session_key:
        request.session.create()
    
    user_favorites = set(FavoriteScene.objects.filter(
        session_key=request.session.session_key
    ).values_list('scene_id', flat=True))

    # ADD PAGINATION RANGE CALCULATION (same as scene_list)
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
    

    context = {
        'page_obj': page_obj,
        'page_range': page_range,
        'query': query,
        'user_favorites': user_favorites,
        'page_size': page_size,
        'total_results': paginator.count,
    }

    # Add ajax support (same as scene list)
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
            'start_index': page_obj.start_index(),
            'end_index': page_obj.end_index(),
        })

    return render(request, 'search_results.html', context)
```

**REPLACE WITH THIS NEW FUNCTION:**
```python
def search_results(request: HttpRequest) -> HttpResponse:
    """Enhanced search results page with filters and analytics"""
    query = request.GET.get('q', '').strip()
    page_number = request.GET.get('page', '1')
    page_size = int(request.GET.get('page_size', '10'))
    
    # Get filter parameters
    country_filter = request.GET.get('country', '')
    setting_filter = request.GET.get('setting', '')
    emotion_filter = request.GET.get('emotion', '')
    age_min = request.GET.get('age_min', '')
    age_max = request.GET.get('age_max', '')

    # Validate page size
    if page_size not in [10, 25, 50, 100]:
        page_size = 10

    # Start with all scenes
    scenes_qs = Scene.objects.all()

    # Apply text search with enhanced algorithm
    if query:
        scenes_qs = enhanced_search(query, scenes_qs)
    
    # Apply filters
    if country_filter:
        scenes_qs = scenes_qs.filter(country__iexact=country_filter)
    
    if setting_filter:
        scenes_qs = scenes_qs.filter(setting__iexact=setting_filter)
    
    if emotion_filter:
        scenes_qs = scenes_qs.filter(emotion__iexact=emotion_filter)
    
    if age_min:
        try:
            age_min_int = int(age_min)
            scenes_qs = scenes_qs.filter(
                Q(effeminate_age__gte=age_min_int) | Q(masculine_age__gte=age_min_int)
            )
        except ValueError:
            pass
    
    if age_max:
        try:
            age_max_int = int(age_max)
            scenes_qs = scenes_qs.filter(
                Q(effeminate_age__lte=age_max_int) | Q(masculine_age__lte=age_max_int)
            )
        except ValueError:
            pass

    # Get pagination
    paginator = Paginator(scenes_qs, page_size)
    try:
        page_obj = paginator.get_page(page_number)
        # Handle invalid page numbers - redirect to last page if too high
        if int(page_number) > paginator.num_pages and paginator.num_pages > 0:
            page_obj = paginator.get_page(paginator.num_pages)
    except Exception:
        page_obj = paginator.get_page(1)

    # Track search query
    if query:
        track_search(request, query, paginator.count)

    # Get user's favorite scene IDs for this session
    if not request.session.session_key:
        request.session.create()
    
    user_favorites = set(FavoriteScene.objects.filter(
        session_key=request.session.session_key
    ).values_list('scene_id', flat=True))

    # Get filter options for dropdowns
    available_countries = Scene.objects.values_list('country', flat=True).distinct().order_by('country')
    available_settings = Scene.objects.values_list('setting', flat=True).distinct().order_by('setting')
    available_emotions = Scene.objects.values_list('emotion', flat=True).distinct().order_by('emotion')

    # Calculate pagination range
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

    context = {
        'page_obj': page_obj,
        'page_range': page_range,
        'query': query,
        'user_favorites': user_favorites,
        'page_size': page_size,
        'total_results': paginator.count,
        'available_countries': available_countries,
        'available_settings': available_settings,
        'available_emotions': available_emotions,
        'current_filters': {
            'country': country_filter,
            'setting': setting_filter,
            'emotion': emotion_filter,
            'age_min': age_min,
            'age_max': age_max,
        }
    }

    # Add AJAX support for pagination
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
            'start_index': page_obj.start_index(),
            'end_index': page_obj.end_index(),
        })

    return render(request, 'search_results.html', context)
```

#### STEP 4: ADD AUTOCOMPLETE FUNCTION (after the search_results function)
**ADD THIS NEW FUNCTION:**
```python
def autocomplete_suggestions(request: HttpRequest) -> JsonResponse:
    """Enhanced autocomplete API with categorized suggestions"""
    query = request.GET.get('q', '').strip().lower()
    if len(query) < 2:
        return JsonResponse({'suggestions': []})
    
    suggestions = []
    
    # 1. Scene titles (highest priority)
    title_matches = Scene.objects.filter(
        title__icontains=query
    ).values_list('title', flat=True)[:3]
    
    for title in title_matches:
        suggestions.append({
            'text': title,
            'type': 'title',
            'category': 'Scene Titles',
            'priority': 10
        })
    
    # 2. Countries
    country_matches = Scene.objects.filter(
        country__icontains=query
    ).values_list('country', flat=True).distinct()[:3]
    
    for country in country_matches:
        suggestions.append({
            'text': country,
            'type': 'country',
            'category': 'Countries',
            'priority': 8
        })
    
    # 3. Settings
    setting_matches = Scene.objects.filter(
        setting__icontains=query
    ).values_list('setting', flat=True).distinct()[:3]
    
    for setting in setting_matches:
        suggestions.append({
            'text': setting,
            'type': 'setting',
            'category': 'Settings',
            'priority': 7
        })
    
    # 4. Emotions
    emotion_matches = Scene.objects.filter(
        emotion__icontains=query
    ).values_list('emotion', flat=True).distinct()[:3]
    
    for emotion in emotion_matches:
        suggestions.append({
            'text': emotion,
            'type': 'emotion',
            'category': 'Emotions',
            'priority': 6
        })
    
    # 5. Popular searches from history
    try:
        popular_searches = SearchQuery.objects.filter(
            query__icontains=query
        ).values('query').annotate(
            count=Count('id')
        ).order_by('-count')[:2]
        
        for search in popular_searches:
            suggestions.append({
                'text': search['query'],
                'type': 'history',
                'category': 'Popular Searches',
                'priority': 5,
                'count': search['count']
            })
    except:
        pass  # In case SearchQuery model doesn't exist yet
    
    # Sort by priority and limit results
    suggestions.sort(key=lambda x: x['priority'], reverse=True)
    suggestions = suggestions[:10]
    
    return JsonResponse({
        'suggestions': suggestions,
        'query': query
    })
```

### 2. Update Models

#### File: `scenes_project/scenes_app/models.py`

**Add these fields to the SearchQuery model (if it exists) or create it:**
```python
# Add these imports at the top if not already present
from django.db import models

# Enhance the existing SearchQuery model or add this if it doesn't exist
class SearchQuery(models.Model):
    query = models.CharField(max_length=255)
    session_key = models.CharField(max_length=40)
    results_count = models.IntegerField(default=0)
    clicked_result = models.ForeignKey('Scene', null=True, blank=True, on_delete=models.SET_NULL)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['query', 'timestamp']),
            models.Index(fields=['session_key', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.query} ({self.results_count} results)"

# Add indexes to the Scene model (add this to the existing Scene model's Meta class)
class Scene(models.Model):
    # ... existing fields ...
    
    class Meta:
        indexes = [
            models.Index(fields=['title']),
            models.Index(fields=['country']),
            models.Index(fields=['setting']),
            models.Index(fields=['emotion']),
            models.Index(fields=['effeminate_age']),
            models.Index(fields=['masculine_age']),
            # Composite indexes for common filter combinations
            models.Index(fields=['country', 'setting']),
            models.Index(fields=['emotion', 'country']),
        ]
```

### 3. Update URLs

#### File: `scenes_project/scenes_app/urls.py`

**Add the autocomplete URL pattern:**
```python
# Add this to your existing urlpatterns list
urlpatterns = [
    # ... existing patterns ...
    path('api/autocomplete/', views.autocomplete_suggestions, name='autocomplete_suggestions'),
    # ... rest of existing patterns ...
]
```

### 4. Update Templates

#### File: `scenes_project/scenes_app/templates/search_results.html`

**Replace the content after the stats bar and before the scene cards include:**
```html
<!-- Add this right after the stats bar div and before {% include 'partials/_scene_cards.html' %} -->

<!-- Search Filters -->
<div class="search-filters bg-white rounded-xl border border-gray-200 shadow-sm mb-6 p-4">
    <form method="GET" id="search-filters-form">
        <input type="hidden" name="q" value="{{ query }}">
        <input type="hidden" name="page_size" value="{{ page_size }}">
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Country Filter -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <select name="country" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="">All Countries</option>
                    {% for country in available_countries %}
                    <option value="{{ country }}" {% if current_filters.country == country %}selected{% endif %}>
                        {{ country }}
                    </option>
                    {% endfor %}
                </select>
            </div>
            
            <!-- Setting Filter -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Setting</label>
                <select name="setting" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="">All Settings</option>
                    {% for setting in available_settings %}
                    <option value="{{ setting }}" {% if current_filters.setting == setting %}selected{% endif %}>
                        {{ setting }}
                    </option>
                    {% endfor %}
                </select>
            </div>
            
            <!-- Emotion Filter -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Emotion</label>
                <select name="emotion" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="">All Emotions</option>
                    {% for emotion in available_emotions %}
                    <option value="{{ emotion }}" {% if current_filters.emotion == emotion %}selected{% endif %}>
                        {{ emotion }}
                    </option>
                    {% endfor %}
                </select>
            </div>
            
            <!-- Age Range -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Age Range</label>
                <div class="flex gap-2">
                    <input type="number" name="age_min" placeholder="Min" value="{{ current_filters.age_min }}" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    <input type="number" name="age_max" placeholder="Max" value="{{ current_filters.age_max }}"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                </div>
            </div>
        </div>
        
        <div class="flex justify-between items-center mt-4">
            <button type="button" id="clear-filters" class="text-sm text-gray-500 hover:text-gray-700">
                Clear All Filters
            </button>
            <button type="submit" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                Apply Filters
            </button>
        </div>
    </form>
</div>

<script>
// Add filter handling JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const clearFiltersBtn = document.getElementById('clear-filters');
    const filtersForm = document.getElementById('search-filters-form');
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            // Clear all form inputs except query and page_size
            const inputs = filtersForm.querySelectorAll('select, input[type="number"]');
            inputs.forEach(input => {
                if (input.name !== 'q' && input.name !== 'page_size') {
                    input.value = '';
                }
            });
            filtersForm.submit();
        });
    }
    
    // Auto-submit on filter change
    const filterInputs = filtersForm.querySelectorAll('select, input[type="number"]');
    filterInputs.forEach(input => {
        if (input.name !== 'q' && input.name !== 'page_size') {
            input.addEventListener('change', function() {
                // Reset to page 1 when filters change
                const pageInput = filtersForm.querySelector('input[name="page"]');
                if (pageInput) {
                    pageInput.value = '1';
                }
                filtersForm.submit();
            });
        }
    });
});
</script>
```

### 5. Enhanced JavaScript

#### File: `scenes_project/scenes_app/static/js/nav-search.js`

**Replace the entire content with enhanced autocomplete:**
```javascript
/**
 * Enhanced Navigation Search with Advanced Autocomplete
 */

class EnhancedAutocomplete {
    constructor(inputSelector, dropdownSelector) {
        this.input = document.querySelector(inputSelector);
        this.dropdown = document.querySelector(dropdownSelector);
        this.suggestions = [];
        this.selectedIndex = -1;
        this.debounceTimer = null;
        
        this.init();
    }
    
    init() {
        if (!this.input || !this.dropdown) return;
        
        this.input.addEventListener('input', (e) => {
            this.handleInput(e.target.value);
        });
        
        this.input.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
        
        this.input.addEventListener('focus', () => {
            if (this.suggestions.length > 0) {
                this.showDropdown();
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!this.input.contains(e.target) && !this.dropdown.contains(e.target)) {
                this.hideDropdown();
            }
        });
    }
    
    handleInput(value) {
        clearTimeout(this.debounceTimer);
        
        if (value.length < 2) {
            this.hideDropdown();
            return;
        }
        
        this.debounceTimer = setTimeout(() => {
            this.fetchSuggestions(value);
        }, 300);
    }
    
    async fetchSuggestions(query) {
        try {
            const response = await fetch(`/api/autocomplete/?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            this.suggestions = data.suggestions || [];
            this.renderSuggestions();
            
            if (this.suggestions.length > 0) {
                this.showDropdown();
            } else {
                this.hideDropdown();
            }
        } catch (error) {
            console.error('Autocomplete error:', error);
            this.hideDropdown();
        }
    }
    
    renderSuggestions() {
        if (this.suggestions.length === 0) {
            this.dropdown.innerHTML = '<div class="p-3 text-gray-500 text-sm">No suggestions found</div>';
            return;
        }
        
        // Group suggestions by category
        const grouped = this.suggestions.reduce((acc, suggestion) => {
            const category = suggestion.category || 'Other';
            if (!acc[category]) acc[category] = [];
            acc[category].push(suggestion);
            return acc;
        }, {});
        
        let html = '';
        
        Object.entries(grouped).forEach(([category, items]) => {
            html += `<div class="suggestion-category">`;
            html += `<div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">${category}</div>`;
            
            items.forEach((suggestion, index) => {
                const globalIndex = this.suggestions.indexOf(suggestion);
                const isSelected = globalIndex === this.selectedIndex;
                
                html += `
                    <div class="suggestion-item px-3 py-2 cursor-pointer hover:bg-gray-100 ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}" 
                         data-index="${globalIndex}"
                         data-text="${suggestion.text}">
                        <div class="flex items-center justify-between">
                            <span class="suggestion-text">${this.highlightMatch(suggestion.text)}</span>
                            ${suggestion.count ? `<span class="text-xs text-gray-400">${suggestion.count} searches</span>` : ''}
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                            <span class="suggestion-type">${this.getTypeIcon(suggestion.type)} ${suggestion.type}</span>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        });
        
        this.dropdown.innerHTML = html;
        
        // Add click handlers
        this.dropdown.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectSuggestion(item.dataset.text);
            });
        });
    }
    
    highlightMatch(text) {
        const query = this.input.value.toLowerCase();
        const index = text.toLowerCase().indexOf(query);
        
        if (index === -1) return text;
        
        return text.substring(0, index) + 
               `<strong class="font-semibold">${text.substring(index, index + query.length)}</strong>` +
               text.substring(index + query.length);
    }
    
    getTypeIcon(type) {
        const icons = {
            'title': '📖',
            'country': '🌍',
            'setting': '🏞️',
            'emotion': '💝',
            'history': '🔍'
        };
        return icons[type] || '📝';
    }
    
    handleKeydown(e) {
        if (!this.dropdown.classList.contains('block')) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
                this.renderSuggestions();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.renderSuggestions();
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0) {
                    this.selectSuggestion(this.suggestions[this.selectedIndex].text);
                } else {
                    this.input.form.submit();
                }
                break;
                
            case 'Escape':
                this.hideDropdown();
                break;
        }
    }
    
    selectSuggestion(text) {
        this.input.value = text;
        this.hideDropdown();
        this.input.form.submit();
    }
    
    showDropdown() {
        this.dropdown.classList.remove('hidden');
        this.dropdown.classList.add('block');
    }
    
    hideDropdown() {
        this.dropdown.classList.add('hidden');
        this.dropdown.classList.remove('block');
        this.selectedIndex = -1;
    }
}

// Initialize enhanced autocomplete when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Desktop autocomplete
    new EnhancedAutocomplete('#nav-search-query', '#nav-autocomplete-dropdown');
    // Mobile autocomplete  
    new EnhancedAutocomplete('#mobile-search-query', '#mobile-autocomplete-dropdown');
});
```

### 6. Database Migration

**Run these commands in your terminal:**
```bash
# Create and run migrations for the model changes
python manage.py makemigrations
python manage.py migrate

# If you need to create the SearchQuery model from scratch:
python manage.py makemigrations scenes_app --empty
# Then edit the migration file to add the SearchQuery model
```

### 7. Analytics View (Optional)

#### File: `scenes_project/scenes_app/views.py`

**Add this view for search analytics:**
```python
def search_analytics(request: HttpRequest) -> HttpResponse:
    """Search analytics dashboard"""
    # Popular searches
    popular_searches = SearchQuery.objects.values('query').annotate(
        count=Count('id'),
        avg_results=Avg('results_count')
    ).order_by('-count')[:20]
    
    # Zero result searches
    zero_result_searches = SearchQuery.objects.filter(
        results_count=0
    ).values('query').annotate(
        count=Count('id')
    ).order_by('-count')[:10]
    
    # Search trends over time
    from django.utils import timezone
    from datetime import timedelta
    
    last_30_days = timezone.now() - timedelta(days=30)
    daily_searches = SearchQuery.objects.filter(
        timestamp__gte=last_30_days
    ).extra(
        select={'day': 'date(timestamp)'}
    ).values('day').annotate(
        count=Count('id')
    ).order_by('day')
    
    context = {
        'popular_searches': popular_searches,
        'zero_result_searches': zero_result_searches,
        'daily_searches': daily_searches,
    }
    
    return render(request, 'analytics.html', context)
```

## Implementation Order

1. **First**: Update `views.py` with enhanced search functions
2. **Second**: Update `models.py` and run migrations  
3. **Third**: Update `urls.py` to add autocomplete endpoint
4. **Fourth**: Update `search_results.html` template with filters
5. **Fifth**: Update `nav-search.js` with enhanced autocomplete
6. **Sixth**: Test everything and add analytics view if needed

This implementation uses your existing project structure and files, enhancing them with better search capabilities, filters, and intelligent autocomplete.
### 2.
 File: `scenes_project/scenes_app/urls.py`

#### ADD AUTOCOMPLETE URL
**FIND YOUR EXISTING URLPATTERNS:**
```python
urlpatterns = [
    # ... your existing patterns ...
]
```

**ADD THIS LINE INSIDE THE URLPATTERNS LIST:**
```python
    path('api/autocomplete/', views.autocomplete_suggestions, name='autocomplete_suggestions'),
```

### 3. File: `scenes_project/scenes_app/models.py`

#### ADD SEARCHQUERY MODEL (if it doesn't exist)
**ADD THIS MODEL AT THE END OF THE FILE:**
```python
class SearchQuery(models.Model):
    query = models.CharField(max_length=255)
    session_key = models.CharField(max_length=40)
    results_count = models.IntegerField(default=0)
    clicked_result = models.ForeignKey('Scene', null=True, blank=True, on_delete=models.SET_NULL)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['query', 'timestamp']),
            models.Index(fields=['session_key', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.query} ({self.results_count} results)"
```

#### UPDATE SCENE MODEL META CLASS
**FIND THE EXISTING SCENE MODEL'S META CLASS:**
```python
class Scene(models.Model):
    # ... existing fields ...
    
    class Meta:
        # ... existing meta options ...
```

**REPLACE THE META CLASS WITH:**
```python
    class Meta:
        indexes = [
            models.Index(fields=['title']),
            models.Index(fields=['country']),
            models.Index(fields=['setting']),
            models.Index(fields=['emotion']),
            models.Index(fields=['effeminate_age']),
            models.Index(fields=['masculine_age']),
            # Composite indexes for common filter combinations
            models.Index(fields=['country', 'setting']),
            models.Index(fields=['emotion', 'country']),
        ]
```

### 4. File: `scenes_project/scenes_app/templates/search_results.html`

#### ADD SEARCH FILTERS SECTION
**FIND THIS LINE:**
```html
<!-- Search Results -->
{% include 'partials/_scene_cards.html' %}
```

**REPLACE WITH:**
```html
<!-- Search Filters -->
<div class="search-filters bg-white rounded-xl border border-gray-200 shadow-sm mb-6 p-4">
    <form method="GET" id="search-filters-form">
        <input type="hidden" name="q" value="{{ query }}">
        <input type="hidden" name="page_size" value="{{ page_size }}">
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Country Filter -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <select name="country" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="">All Countries</option>
                    {% for country in available_countries %}
                    <option value="{{ country }}" {% if current_filters.country == country %}selected{% endif %}>
                        {{ country }}
                    </option>
                    {% endfor %}
                </select>
            </div>
            
            <!-- Setting Filter -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Setting</label>
                <select name="setting" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="">All Settings</option>
                    {% for setting in available_settings %}
                    <option value="{{ setting }}" {% if current_filters.setting == setting %}selected{% endif %}>
                        {{ setting }}
                    </option>
                    {% endfor %}
                </select>
            </div>
            
            <!-- Emotion Filter -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Emotion</label>
                <select name="emotion" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="">All Emotions</option>
                    {% for emotion in available_emotions %}
                    <option value="{{ emotion }}" {% if current_filters.emotion == emotion %}selected{% endif %}>
                        {{ emotion }}
                    </option>
                    {% endfor %}
                </select>
            </div>
            
            <!-- Age Range -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Age Range</label>
                <div class="flex gap-2">
                    <input type="number" name="age_min" placeholder="Min" value="{{ current_filters.age_min }}" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    <input type="number" name="age_max" placeholder="Max" value="{{ current_filters.age_max }}"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                </div>
            </div>
        </div>
        
        <div class="flex justify-between items-center mt-4">
            <button type="button" id="clear-filters" class="text-sm text-gray-500 hover:text-gray-700">
                Clear All Filters
            </button>
            <button type="submit" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                Apply Filters
            </button>
        </div>
    </form>
</div>

<script>
// Add filter handling JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const clearFiltersBtn = document.getElementById('clear-filters');
    const filtersForm = document.getElementById('search-filters-form');
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            // Clear all form inputs except query and page_size
            const inputs = filtersForm.querySelectorAll('select, input[type="number"]');
            inputs.forEach(input => {
                if (input.name !== 'q' && input.name !== 'page_size') {
                    input.value = '';
                }
            });
            filtersForm.submit();
        });
    }
    
    // Auto-submit on filter change
    const filterInputs = filtersForm.querySelectorAll('select, input[type="number"]');
    filterInputs.forEach(input => {
        if (input.name !== 'q' && input.name !== 'page_size') {
            input.addEventListener('change', function() {
                // Reset to page 1 when filters change
                const pageInput = filtersForm.querySelector('input[name="page"]');
                if (pageInput) {
                    pageInput.value = '1';
                }
                filtersForm.submit();
            });
        }
    });
});
</script>

<!-- Search Results -->
{% include 'partials/_scene_cards.html' %}
```

### 5. File: `scenes_project/scenes_app/static/js/nav-search.js`

#### COMPLETELY REPLACE THE ENTIRE FILE CONTENT
**DELETE EVERYTHING IN THE FILE AND REPLACE WITH:**
```javascript
/**
 * Enhanced Navigation Search with Advanced Autocomplete
 */

class EnhancedAutocomplete {
    constructor(inputSelector, dropdownSelector) {
        this.input = document.querySelector(inputSelector);
        this.dropdown = document.querySelector(dropdownSelector);
        this.suggestions = [];
        this.selectedIndex = -1;
        this.debounceTimer = null;
        
        this.init();
    }
    
    init() {
        if (!this.input || !this.dropdown) return;
        
        this.input.addEventListener('input', (e) => {
            this.handleInput(e.target.value);
        });
        
        this.input.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
        
        this.input.addEventListener('focus', () => {
            if (this.suggestions.length > 0) {
                this.showDropdown();
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!this.input.contains(e.target) && !this.dropdown.contains(e.target)) {
                this.hideDropdown();
            }
        });
    }
    
    handleInput(value) {
        clearTimeout(this.debounceTimer);
        
        if (value.length < 2) {
            this.hideDropdown();
            return;
        }
        
        this.debounceTimer = setTimeout(() => {
            this.fetchSuggestions(value);
        }, 300);
    }
    
    async fetchSuggestions(query) {
        try {
            const response = await fetch(`/api/autocomplete/?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            this.suggestions = data.suggestions || [];
            this.renderSuggestions();
            
            if (this.suggestions.length > 0) {
                this.showDropdown();
            } else {
                this.hideDropdown();
            }
        } catch (error) {
            console.error('Autocomplete error:', error);
            this.hideDropdown();
        }
    }
    
    renderSuggestions() {
        if (this.suggestions.length === 0) {
            this.dropdown.innerHTML = '<div class="p-3 text-gray-500 text-sm">No suggestions found</div>';
            return;
        }
        
        // Group suggestions by category
        const grouped = this.suggestions.reduce((acc, suggestion) => {
            const category = suggestion.category || 'Other';
            if (!acc[category]) acc[category] = [];
            acc[category].push(suggestion);
            return acc;
        }, {});
        
        let html = '';
        
        Object.entries(grouped).forEach(([category, items]) => {
            html += `<div class="suggestion-category">`;
            html += `<div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">${category}</div>`;
            
            items.forEach((suggestion, index) => {
                const globalIndex = this.suggestions.indexOf(suggestion);
                const isSelected = globalIndex === this.selectedIndex;
                
                html += `
                    <div class="suggestion-item px-3 py-2 cursor-pointer hover:bg-gray-100 ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}" 
                         data-index="${globalIndex}"
                         data-text="${suggestion.text}">
                        <div class="flex items-center justify-between">
                            <span class="suggestion-text">${this.highlightMatch(suggestion.text)}</span>
                            ${suggestion.count ? `<span class="text-xs text-gray-400">${suggestion.count} searches</span>` : ''}
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                            <span class="suggestion-type">${this.getTypeIcon(suggestion.type)} ${suggestion.type}</span>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        });
        
        this.dropdown.innerHTML = html;
        
        // Add click handlers
        this.dropdown.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectSuggestion(item.dataset.text);
            });
        });
    }
    
    highlightMatch(text) {
        const query = this.input.value.toLowerCase();
        const index = text.toLowerCase().indexOf(query);
        
        if (index === -1) return text;
        
        return text.substring(0, index) + 
               `<strong class="font-semibold">${text.substring(index, index + query.length)}</strong>` +
               text.substring(index + query.length);
    }
    
    getTypeIcon(type) {
        const icons = {
            'title': '📖',
            'country': '🌍',
            'setting': '🏞️',
            'emotion': '💝',
            'history': '🔍'
        };
        return icons[type] || '📝';
    }
    
    handleKeydown(e) {
        if (!this.dropdown.classList.contains('block')) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
                this.renderSuggestions();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.renderSuggestions();
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0) {
                    this.selectSuggestion(this.suggestions[this.selectedIndex].text);
                } else {
                    this.input.form.submit();
                }
                break;
                
            case 'Escape':
                this.hideDropdown();
                break;
        }
    }
    
    selectSuggestion(text) {
        this.input.value = text;
        this.hideDropdown();
        this.input.form.submit();
    }
    
    showDropdown() {
        this.dropdown.classList.remove('hidden');
        this.dropdown.classList.add('block');
    }
    
    hideDropdown() {
        this.dropdown.classList.add('hidden');
        this.dropdown.classList.remove('block');
        this.selectedIndex = -1;
    }
}

// Initialize enhanced autocomplete when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Desktop autocomplete
    new EnhancedAutocomplete('#nav-search-query', '#nav-autocomplete-dropdown');
    // Mobile autocomplete  
    new EnhancedAutocomplete('#mobile-search-query', '#mobile-autocomplete-dropdown');
});
```

### 6. RUN DATABASE MIGRATIONS

**Execute these commands in your terminal:**
```bash
python manage.py makemigrations
python manage.py migrate
```

## IMPLEMENTATION ORDER:

1. **FIRST**: Update `views.py` (Steps 1-4 above)
2. **SECOND**: Update `urls.py` (add autocomplete URL)
3. **THIRD**: Update `models.py` (add SearchQuery model and indexes)
4. **FOURTH**: Run migrations
5. **FIFTH**: Update `search_results.html` (add filters)
6. **SIXTH**: Replace `nav-search.js` completely
7. **SEVENTH**: Test everything

This gives you exactly what to remove and what to add in each file!