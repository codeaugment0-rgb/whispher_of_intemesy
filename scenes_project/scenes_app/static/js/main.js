/* global Toastify */
(function () {
  // Copy prompt on detail page
  const copyBtn = document.getElementById('copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async function () {
      const id = this.getAttribute('data-scene-id');
      try {
        const res = await fetch(`/api/scene/${id}/prompt/`);
        const data = await res.json();
        await navigator.clipboard.writeText(data.full_text || '');
        Toastify({
          text: 'Prompt copied to clipboard',
          duration: 2500,
          gravity: 'top',
          position: 'right',
          backgroundColor: '#10b981',
          close: true
        }).showToast();
      } catch (err) {
        Toastify({
          text: 'Failed to copy prompt',
          duration: 2500,
          gravity: 'top',
          position: 'right',
          backgroundColor: '#ef4444',
          close: true
        }).showToast();
      }
    });
  }

  // Random scene functionality
  async function getRandomScene() {
    try {
      const res = await fetch('/api/random/');
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      return data;
    } catch (err) {
      Toastify({
        text: 'Failed to get random scene',
        duration: 2500,
        gravity: 'top',
        position: 'right',
        backgroundColor: '#ef4444',
        close: true
      }).showToast();
      throw err;
    }
  }

  // Keyboard shortcut for random scene (R key)
  document.addEventListener('keydown', function(e) {
    // Only trigger if not typing in an input field
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable) {
      if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        window.location.href = '/random/';
      }
    }
  });

  // Add tooltip for keyboard shortcut
  const randomButtons = document.querySelectorAll('a[href="/random/"]');
  randomButtons.forEach(btn => {
    btn.title = 'Random Scene (Press R)';
  });

  // Enhanced copy button feedback
  const copyButton = document.getElementById('copy-btn');
  if (copyButton) {
    copyButton.addEventListener('click', function() {
      const originalText = this.innerHTML;
      this.innerHTML = `
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
        </svg>
        Copied!
      `;
      this.classList.add('bg-green-600', 'hover:bg-green-700');
      this.classList.remove('from-primary', 'to-primary-dark', 'hover:from-primary-dark', 'hover:to-primary');
      
      setTimeout(() => {
        this.innerHTML = originalText;
        this.classList.remove('bg-green-600', 'hover:bg-green-700');
        this.classList.add('from-primary', 'to-primary-dark', 'hover:from-primary-dark', 'hover:to-primary');
      }, 2000);
    });
  }

  // Smooth scroll for long scene descriptions
  const promptText = document.getElementById('prompt-text');
  if (promptText && promptText.scrollHeight > promptText.clientHeight) {
    promptText.style.maxHeight = '400px';
    promptText.style.overflowY = 'auto';
    promptText.classList.add('scrollbar-thin', 'scrollbar-thumb-gray-300', 'scrollbar-track-gray-100');
  }

  // Enhanced loading states for navigation with mobile support
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href]');
    if (link && !link.href.includes('#') && !link.target && !link.classList.contains('favorite-btn')) {
      // Remove existing spinners to prevent duplicates
      document.querySelectorAll('.spinner').forEach(spinner => spinner.remove());
      
      // Add loading state for mobile-friendly buttons
      if (link.classList.contains('hero-button') || link.classList.contains('scene-card-main-button')) {
        const originalText = link.innerHTML;
        const spinner = document.createElement('div');
        spinner.className = 'spinner inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2';
        
        // Store original content
        link.dataset.originalContent = originalText;
        
        // Update button content with spinner
        const textSpan = link.querySelector('span') || link;
        if (textSpan.tagName === 'SPAN') {
          textSpan.innerHTML = '';
          textSpan.appendChild(spinner);
          textSpan.appendChild(document.createTextNode('Loading...'));
        } else {
          link.innerHTML = '';
          link.appendChild(spinner);
          link.appendChild(document.createTextNode('Loading...'));
        }
        
        // Add loading class for visual feedback
        link.classList.add('opacity-75', 'cursor-wait');
      } else {
        // Standard spinner for other links
        const spinner = document.createElement('div');
        spinner.className = 'spinner inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin ml-2';
        link.appendChild(spinner);
      }
    }
  });

  // Enhanced spinner cleanup with mobile support
  function cleanupLoadingStates() {
    document.querySelectorAll('.spinner').forEach(spinner => spinner.remove());
    
    // Restore original button content
    document.querySelectorAll('[data-original-content]').forEach(button => {
      button.innerHTML = button.dataset.originalContent;
      button.removeAttribute('data-original-content');
      button.classList.remove('opacity-75', 'cursor-wait');
    });
  }

  // Remove spinners on page load
  window.addEventListener('load', cleanupLoadingStates);

  // Remove spinners on back/forward navigation
  window.addEventListener('popstate', cleanupLoadingStates);

  // Remove spinners on page show (for additional back/forward handling in some browsers)
  window.addEventListener('pageshow', function(e) {
    if (e.persisted) {
      cleanupLoadingStates();
    }
  });

  // Mobile-specific enhancements
  if ('ontouchstart' in window) {
    // Add touch feedback for buttons
    document.addEventListener('touchstart', function(e) {
      const button = e.target.closest('button, a');
      if (button && !button.disabled) {
        button.style.transform = 'scale(0.98)';
        button.style.transition = 'transform 0.1s ease';
      }
    });

    document.addEventListener('touchend', function(e) {
      const button = e.target.closest('button, a');
      if (button) {
        setTimeout(() => {
          button.style.transform = '';
        }, 100);
      }
    });

    // Prevent double-tap zoom on buttons
    document.addEventListener('touchend', function(e) {
      const button = e.target.closest('button, a, .touch-target');
      if (button) {
        e.preventDefault();
        // Trigger click after preventing default
        setTimeout(() => {
          if (!e.defaultPrevented) {
            button.click();
          }
        }, 10);
      }
    });
  }

  // Favorite functionality
  async function toggleFavorite(sceneId, button) {
    try {
      const response = await fetch(`/scene/${sceneId}/toggle-favorite/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCsrfToken(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      if (data.success) {
        updateFavoriteButton(button, data.is_favorited);
        
        // Update favorite count if it exists
        const favoriteCount = document.getElementById('favorite-count');
        if (favoriteCount) {
          favoriteCount.textContent = `(${data.favorite_count})`;
        }

        // Update navigation favorite count
        updateNavFavoriteCount(data.is_favorited);

        // Show toast notification
        Toastify({
          text: data.message,
          duration: 2500,
          gravity: 'top',
          position: 'right',
          backgroundColor: data.is_favorited ? '#ef4444' : '#6b7280',
          close: true
        }).showToast();

        // If we're on the favorites page and item was removed, fade it out
        if (!data.is_favorited && window.location.pathname.includes('favorites')) {
          const card = button.closest('article');
          if (card) {
            card.style.transition = 'opacity 0.3s ease-out';
            card.style.opacity = '0.5';
            setTimeout(() => {
              // Optionally reload the page to update the list
              window.location.reload();
            }, 1000);
          }
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Toastify({
        text: 'Failed to update favorite',
        duration: 2500,
        gravity: 'top',
        position: 'right',
        backgroundColor: '#ef4444',
        close: true
      }).showToast();
    }
  }

  function updateFavoriteButton(button, isFavorited) {
    const svg = button.querySelector('svg');
    const text = button.querySelector('#favorite-text');
    
    if (isFavorited) {
      // Add to favorites styling
      button.className = button.className.replace(
        /bg-gradient-to-r from-gray-\d+ to-gray-\d+ text-gray-\d+ hover:from-gray-\d+ hover:to-gray-\d+ focus:ring-gray-\d+/g,
        'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-red-500'
      );
      svg.setAttribute('fill', 'currentColor');
      if (text) text.textContent = 'Remove from Favorites';
      button.title = 'Remove from favorites';
    } else {
      // Remove from favorites styling
      button.className = button.className.replace(
        /bg-gradient-to-r from-red-\d+ to-red-\d+ text-white hover:from-red-\d+ hover:to-red-\d+ focus:ring-red-\d+/g,
        'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 focus:ring-gray-400'
      );
      svg.setAttribute('fill', 'none');
      if (text) text.textContent = 'Add to Favorites';
      button.title = 'Add to favorites';
    }
  }

  function getCsrfToken() {
    // Try to get from global variable first
    if (window.csrfToken) {
      return window.csrfToken;
    }
    
    // Fallback to cookie method
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrftoken') {
        return value;
      }
    }
    return '';
  }

  function updateNavFavoriteCount(isAdding) {
    const navCount = document.getElementById('nav-favorite-count');
    if (navCount) {
      let currentCount = parseInt(navCount.textContent) || 0;
      const newCount = isAdding ? currentCount + 1 : Math.max(0, currentCount - 1);
      
      if (newCount > 0) {
        navCount.textContent = newCount;
        navCount.classList.remove('hidden');
      } else {
        navCount.classList.add('hidden');
      }
    }
  }

  // Initialize navigation favorite count on page load
  function initNavFavoriteCount() {
    // This would need to be set from the server-side template
    // For now, we'll just show/hide based on whether there are favorites
    const navCount = document.getElementById('nav-favorite-count');
    if (navCount && window.totalFavorites) {
      if (window.totalFavorites > 0) {
        navCount.textContent = window.totalFavorites;
        navCount.classList.remove('hidden');
      }
    }
  }

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', initNavFavoriteCount);

  // Add event listeners for favorite buttons
  document.addEventListener('click', function(e) {
    const favoriteBtn = e.target.closest('.favorite-btn, #favorite-btn');
    if (favoriteBtn) {
      e.preventDefault();
      const sceneId = favoriteBtn.getAttribute('data-scene-id');
      if (sceneId) {
        toggleFavorite(sceneId, favoriteBtn);
      }
    }
  });
})();  /
/ Mobile viewport height fix for iOS Safari
  function setMobileViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  // Set initial viewport height
  setMobileViewportHeight();

  // Update on resize and orientation change
  window.addEventListener('resize', setMobileViewportHeight);
  window.addEventListener('orientationchange', function() {
    setTimeout(setMobileViewportHeight, 100);
  });

  // Smooth scroll polyfill for older mobile browsers
  if (!('scrollBehavior' in document.documentElement.style)) {
    const smoothScrollPolyfill = function(element, to, duration) {
      const start = element.scrollTop;
      const change = to - start;
      const startTime = performance.now();

      function animateScroll(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeInOutQuad = progress < 0.5 
          ? 2 * progress * progress 
          : -1 + (4 - 2 * progress) * progress;
        
        element.scrollTop = start + change * easeInOutQuad;
        
        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        }
      }
      
      requestAnimationFrame(animateScroll);
    };

    // Override smooth scroll behavior
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a[href^="#"]');
      if (link) {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          smoothScrollPolyfill(document.documentElement, target.offsetTop, 500);
        }
      }
    });
  }

  // Enhanced mobile menu accessibility
  function enhanceMobileMenuAccessibility() {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    
    if (mobileMenu && mobileMenuButton) {
      // Set ARIA attributes
      mobileMenuButton.setAttribute('aria-expanded', 'false');
      mobileMenuButton.setAttribute('aria-controls', 'mobile-menu');
      mobileMenu.setAttribute('aria-labelledby', 'mobile-menu-button');
      
      // Update ARIA state when menu toggles
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.attributeName === 'class') {
            const isHidden = mobileMenu.classList.contains('hidden');
            mobileMenuButton.setAttribute('aria-expanded', !isHidden);
          }
        });
      });
      
      observer.observe(mobileMenu, { attributes: true, attributeFilter: ['class'] });
    }
  }

  // Initialize mobile enhancements
  document.addEventListener('DOMContentLoaded', function() {
    enhanceMobileMenuAccessibility();
    
    // Add swipe gesture support for mobile navigation
    if ('ontouchstart' in window) {
      let startX = 0;
      let startY = 0;
      let isScrolling = false;
      
      document.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isScrolling = false;
      });
      
      document.addEventListener('touchmove', function(e) {
        if (!startX || !startY) return;
        
        const diffX = Math.abs(e.touches[0].clientX - startX);
        const diffY = Math.abs(e.touches[0].clientY - startY);
        
        if (diffY > diffX) {
          isScrolling = true;
        }
      });
      
      document.addEventListener('touchend', function(e) {
        if (!startX || !startY || isScrolling) return;
        
        const endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;
        
        // Swipe left to open menu (from right edge)
        if (diffX < -50 && startX > window.innerWidth - 50) {
          const mobileMenuButton = document.getElementById('mobile-menu-button');
          const mobileMenu = document.getElementById('mobile-menu');
          
          if (mobileMenuButton && mobileMenu && mobileMenu.classList.contains('hidden')) {
            mobileMenuButton.click();
          }
        }
        
        // Reset values
        startX = 0;
        startY = 0;
        isScrolling = false;
      });
    }
  });

  // Performance optimization for mobile
  function optimizeForMobile() {
    // Lazy load images that are not in viewport
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      });
      
      document.querySelectorAll('img[data-src]').forEach(function(img) {
        imageObserver.observe(img);
      });
    }
    
    // Debounce scroll events for better performance
    let scrollTimeout;
    const originalScrollHandler = window.onscroll;
    
    window.onscroll = function() {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      scrollTimeout = setTimeout(function() {
        if (originalScrollHandler) {
          originalScrollHandler();
        }
      }, 16); // ~60fps
    };
  }

  // Initialize mobile optimizations
  if (window.innerWidth <= 768) {
    optimizeForMobile();
  }