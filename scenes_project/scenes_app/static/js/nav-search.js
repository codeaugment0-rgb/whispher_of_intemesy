/**
 * Navigation Search Bar with Autocomplete
 */

class NavSearch {
    constructor() {
        this.desktopInput = document.getElementById('nav-search-query');
        this.mobileInput = document.getElementById('mobile-search-query');
        this.desktopDropdown = document.getElementById('nav-autocomplete-dropdown');
        this.mobileDropdown = document.getElementById('mobile-autocomplete-dropdown');
        this.currentQuery = '';
        this.debounceTimer = null;
        this.selectedIndex = -1;
        this.suggestions = [];
        
        this.init();
    }

    init() {
        if (this.desktopInput) {
            this.bindEvents(this.desktopInput, this.desktopDropdown);
        }
        if (this.mobileInput) {
            this.bindEvents(this.mobileInput, this.mobileDropdown);
        }
    }

    bindEvents(input, dropdown) {
        // Input events
        input.addEventListener('input', (e) => {
            this.handleInput(e, dropdown);
        });

        input.addEventListener('keydown', (e) => {
            this.handleKeydown(e, dropdown);
        });

        input.addEventListener('focus', (e) => {
            if (this.suggestions.length > 0) {
                dropdown.classList.remove('hidden');
            }
        });

        input.addEventListener('blur', (e) => {
            // Delay hiding to allow clicking on suggestions
            setTimeout(() => {
                dropdown.classList.add('hidden');
                this.selectedIndex = -1;
            }, 150);
        });

        // Form submission
        input.closest('form').addEventListener('submit', (e) => {
            const query = input.value.trim();
            if (!query) {
                e.preventDefault();
                return;
            }
            // Form will submit normally to search results page
        });
    }

    handleInput(e, dropdown) {
        const query = e.target.value.trim();
        this.currentQuery = query;
        this.selectedIndex = -1;

        // Clear previous timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        if (query.length < 2) {
            dropdown.classList.add('hidden');
            this.suggestions = [];
            return;
        }

        // Debounce the API call
        this.debounceTimer = setTimeout(() => {
            this.fetchSuggestions(query, dropdown);
        }, 300);
    }

    handleKeydown(e, dropdown) {
        if (!dropdown.classList.contains('hidden')) {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
                    this.updateSelection(dropdown);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                    this.updateSelection(dropdown);
                    break;
                case 'Enter':
                    if (this.selectedIndex >= 0) {
                        e.preventDefault();
                        this.selectSuggestion(this.suggestions[this.selectedIndex], e.target);
                    }
                    break;
                case 'Escape':
                    dropdown.classList.add('hidden');
                    this.selectedIndex = -1;
                    break;
            }
        }
    }

    async fetchSuggestions(query, dropdown) {
        try {
            console.log('Fetching suggestions for:', query);
            const response = await fetch(`/api/search/suggestions/?q=${encodeURIComponent(query)}&limit=8`);
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            console.log('Suggestions response:', data);
            this.suggestions = data.suggestions || [];
            console.log('Parsed suggestions:', this.suggestions);
            this.renderSuggestions(dropdown);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            dropdown.classList.add('hidden');
        }
    }

    renderSuggestions(dropdown) {
        console.log('Rendering suggestions:', this.suggestions.length, 'items');
        if (this.suggestions.length === 0) {
            console.log('No suggestions to show');
            dropdown.classList.add('hidden');
            return;
        }

        const html = this.suggestions.map((suggestion, index) => {
            const isSelected = index === this.selectedIndex;
            const suggestionText = suggestion.display || suggestion.term || suggestion.text || '';
            const suggestionCount = suggestion.frequency || suggestion.count || '';
            return `
                <div class="suggestion-item px-4 py-2 cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-primary text-white' : 'text-gray-900'}"
                     data-suggestion="${suggestionText}"
                     data-index="${index}">
                    <div class="flex items-center">
                        <svg class="w-4 h-4 mr-2 flex-shrink-0 ${isSelected ? 'text-white' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        <span class="truncate">${this.highlightMatch(suggestionText, this.currentQuery)}</span>
                        ${suggestionCount ? `<span class="ml-auto text-xs ${isSelected ? 'text-white/70' : 'text-gray-500'}">${suggestionCount}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        dropdown.innerHTML = html;
        dropdown.classList.remove('hidden');

        // Add click handlers
        dropdown.querySelectorAll('.suggestion-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                const suggestion = this.suggestions[index];
                const input = dropdown.id.includes('mobile') ? this.mobileInput : this.desktopInput;
                this.selectSuggestion(suggestion, input);
            });
        });
    }

    updateSelection(dropdown) {
        const items = dropdown.querySelectorAll('.suggestion-item');
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.classList.add('bg-primary', 'text-white');
                item.classList.remove('text-gray-900');
                item.querySelector('svg').classList.add('text-white');
                item.querySelector('svg').classList.remove('text-gray-400');
                const countSpan = item.querySelector('.text-xs');
                if (countSpan) {
                    countSpan.classList.add('text-white/70');
                    countSpan.classList.remove('text-gray-500');
                }
            } else {
                item.classList.remove('bg-primary', 'text-white');
                item.classList.add('text-gray-900');
                item.querySelector('svg').classList.remove('text-white');
                item.querySelector('svg').classList.add('text-gray-400');
                const countSpan = item.querySelector('.text-xs');
                if (countSpan) {
                    countSpan.classList.remove('text-white/70');
                    countSpan.classList.add('text-gray-500');
                }
            }
        });
    }

    selectSuggestion(suggestion, input) {
        const suggestionText = suggestion.display || suggestion.term || suggestion.text || '';
        input.value = suggestionText;
        const dropdown = input.id.includes('mobile') ? this.mobileDropdown : this.desktopDropdown;
        dropdown.classList.add('hidden');
        this.selectedIndex = -1;

        // Submit the form
        input.closest('form').submit();
    }

    highlightMatch(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new NavSearch();
});
