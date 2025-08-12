/* global Toastify */
(function () {
  // Copy prompt on detail page
  const copyBtn = document.getElementById('copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
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

  // Copy random scene functionality
  async function copyRandomScene(button) {
    const originalContent = button.innerHTML;
    
    try {
      // Show loading state
      button.innerHTML = `
        <svg class="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        <span class="hidden lg:inline">Loading...</span>
      `;
      button.disabled = true;

      const scene = await getRandomScene();
      await navigator.clipboard.writeText(scene.full_text || '');
      
      // Show success state
      button.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
        </svg>
        <span class="hidden lg:inline">Copied!</span>
      `;
      button.classList.add('text-green-600');

      Toastify({
        text: `Copied "${scene.title}" to clipboard`,
        duration: 3000,
        gravity: 'top',
        position: 'right',
        backgroundColor: '#10b981',
        close: true
      }).showToast();

      // Reset button after 2 seconds
      setTimeout(() => {
        button.innerHTML = originalContent;
        button.classList.remove('text-green-600');
        button.disabled = false;
      }, 2000);

    } catch (err) {
      // Show error state
      button.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        <span class="hidden lg:inline">Failed</span>
      `;
      button.classList.add('text-red-600');

      setTimeout(() => {
        button.innerHTML = originalContent;
        button.classList.remove('text-red-600');
        button.disabled = false;
      }, 2000);
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

  // Enhanced mobile touch feedback with better performance and no menu interference
  if ('ontouchstart' in window) {
    let touchStartTime = 0;
    let touchTarget = null;

    document.addEventListener('touchstart', function(e) {
      touchStartTime = Date.now();
      touchTarget = e.target.closest('.scene-card-main-button, .scene-card-icon-button, .hero-button, .pagination-btn, .mobile-nav-item');

      if (touchTarget && !touchTarget.disabled && !touchTarget.closest('#mobile-menu-button')) {
        touchTarget.style.transform = 'scale(0.96)';
        touchTarget.style.transition = 'transform 0.1s ease';
        touchTarget.style.willChange = 'transform';
      }
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
      if (touchTarget) {
        const touchDuration = Date.now() - touchStartTime;

        // Only apply feedback if it was a quick touch (not a scroll)
        if (touchDuration < 200) {
          setTimeout(() => {
            if (touchTarget) {
              touchTarget.style.transform = '';
              touchTarget.style.willChange = 'auto';
            }
          }, 100);
        } else {
          // Immediate reset for longer touches (likely scrolling)
          touchTarget.style.transform = '';
          touchTarget.style.willChange = 'auto';
        }

        touchTarget = null;
      }
    }, { passive: true });

    // Reset on touch cancel (when scrolling interrupts touch)
    document.addEventListener('touchcancel', function(e) {
      if (touchTarget) {
        touchTarget.style.transform = '';
        touchTarget.style.willChange = 'auto';
        touchTarget = null;
      }
    }, { passive: true });
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
        
        // Favorite count removed as requested

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

    // Copy random scene buttons
    const copyRandomBtn = e.target.closest('#copy-random-scene-btn, #mobile-copy-random-scene-btn');
    if (copyRandomBtn) {
      e.preventDefault();
      copyRandomScene(copyRandomBtn);
    }
  });
})();

  // Mobile viewport height fix for iOS Safari
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

  // Initialize mobile optimizations
  document.addEventListener('DOMContentLoaded', function() {
    // Add mobile class to body for easier targeting
    if (window.innerWidth <= 768) {
      document.body.classList.add('mobile-device');
    }

    // Update on resize
    window.addEventListener('resize', function() {
      if (window.innerWidth <= 768) {
        document.body.classList.add('mobile-device');
      } else {
        document.body.classList.remove('mobile-device');
      }
    });
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

  // Mobile menu accessibility is now handled in base.html template

  // Initialize mobile enhancements
  document.addEventListener('DOMContentLoaded', function() {
    // Add swipe gesture support for mobile navigation (simplified and improved)
    if ('ontouchstart' in window) {
      let startX = 0;
      let startY = 0;
      let isScrolling = false;

      document.addEventListener('touchstart', function(e) {
        // Only track swipes from the edge of the screen
        if (e.touches[0].clientX > window.innerWidth - 50) {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          isScrolling = false;
        }
      }, { passive: true });

      document.addEventListener('touchmove', function(e) {
        if (!startX || !startY) return;

        const diffX = Math.abs(e.touches[0].clientX - startX);
        const diffY = Math.abs(e.touches[0].clientY - startY);

        // Detect if user is scrolling vertically
        if (diffY > diffX && diffY > 10) {
          isScrolling = true;
        }
      }, { passive: true });

      document.addEventListener('touchend', function(e) {
        if (!startX || !startY || isScrolling) {
          startX = 0;
          startY = 0;
          isScrolling = false;
          return;
        }

        const endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;

        // Swipe left to open menu (from right edge)
        if (diffX < -50) {
          const mobileMenuButton = document.getElementById('mobile-menu-button');
          const mobileMenu = document.getElementById('mobile-menu');

          if (mobileMenuButton && mobileMenu && !mobileMenu.classList.contains('show')) {
            mobileMenuButton.click();
          }
        }

        // Reset values
        startX = 0;
        startY = 0;
        isScrolling = false;
      }, { passive: true });
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