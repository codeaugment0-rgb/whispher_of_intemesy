// Hero Carousel JavaScript
class HeroCarousel {
  constructor(container) {
    this.container = container;
    this.slides = container.querySelectorAll('.carousel-slide');
    this.prevBtn = container.querySelector('.carousel-prev');
    this.nextBtn = container.querySelector('.carousel-next');
    this.currentSlide = 0;
    this.isPlaying = true;
    this.interval = null;
    this.intervalDuration = 3000; // 5 seconds

    // Touch/swipe support
    this.touchStartX = 0;
    this.touchEndX = 0;
    this.touchStartY = 0;
    this.touchEndY = 0;
    this.minSwipeDistance = 50;
    this.isTransitioning = false;
    this.isDragging = false;
    this.resizeTimeout = null;

    this.init();
  }

  init() {
    // Initialize first slide
    this.slides[0].classList.add('active');
    this.slides[0].style.opacity = '1';
    this.slides[0].style.transform = 'translateX(0)';

    // Touch/swipe support
    this.container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
    this.container.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.container.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });

    // Mouse drag support for desktop
    this.container.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.container.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.container.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.container.addEventListener('mouseleave', (e) => this.handleMouseUp(e));

    // Pause on hover, resume on leave (desktop only)
    if (!this.isMobile()) {
      this.container.addEventListener('mouseenter', () => this.pause());
      this.container.addEventListener('mouseleave', () => this.play());
    }

    // Pause on focus (for accessibility)
    this.container.addEventListener('focusin', () => this.pause());
    this.container.addEventListener('focusout', () => this.play());

    // Handle keyboard navigation
    this.container.addEventListener('keydown', (e) => this.handleKeydown(e));

    // Handle window resize for responsive adjustments
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.adjustForScreenSize();
      }, 250);
    });

    // Initial screen size adjustment
    this.adjustForScreenSize();

    // Start autoplay after a short delay
    setTimeout(() => {
      this.play();
    }, 100);
  }

  showSlide(index, direction = 'next') {
    if (this.isTransitioning || index === this.currentSlide) return;

    this.isTransitioning = true;
    const currentSlideElement = this.slides[this.currentSlide];
    const nextSlideElement = this.slides[index];

    if (!nextSlideElement) return;

    // Clear all classes from all slides first
    this.slides.forEach(slide => {
      slide.classList.remove('active', 'animate-in-left', 'animate-in-right', 'animate-out-left', 'animate-out-right');
    });

    // Set up the new slide for animation
    if (direction === 'next') {
      nextSlideElement.classList.add('slide-in-right');
    } else {
      nextSlideElement.classList.add('slide-in-left');
    }

    // Force reflow
    nextSlideElement.offsetHeight;

    // Start animations
    if (currentSlideElement && currentSlideElement !== nextSlideElement) {
      if (direction === 'next') {
        currentSlideElement.classList.add('animate-out-left');
      } else {
        currentSlideElement.classList.add('animate-out-right');
      }
    }

    // Animate new slide in
    if (direction === 'next') {
      nextSlideElement.classList.remove('slide-in-right');
      nextSlideElement.classList.add('animate-in-right');
    } else {
      nextSlideElement.classList.remove('slide-in-left');
      nextSlideElement.classList.add('animate-in-left');
    }

    // Set as active for content animation
    nextSlideElement.classList.add('active');
    this.currentSlide = index;

    // Clean up after animation
    setTimeout(() => {
      this.isTransitioning = false;
      this.slides.forEach(slide => {
        slide.classList.remove('animate-in-left', 'animate-in-right', 'animate-out-left', 'animate-out-right', 'slide-in-left', 'slide-in-right');
      });
    }, 700);
  }

  nextSlide() {
    const nextIndex = (this.currentSlide + 1) % this.slides.length;
    this.showSlide(nextIndex, 'next');
  }

  prevSlide() {
    const prevIndex = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
    this.showSlide(prevIndex, 'prev');
  }

  goToSlide(index) {
    if (index >= 0 && index < this.slides.length) {
      const direction = index > this.currentSlide ? 'next' : 'prev';
      this.showSlide(index, direction);
    }
  }

  play() {
    if (this.isPlaying && this.interval) {
      clearInterval(this.interval);
    }
    this.isPlaying = true;
    this.interval = setInterval(() => this.nextSlide(), this.intervalDuration);
  }

  pause() {
    if (this.isPlaying) {
      this.isPlaying = false;
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    }
  }

  handleKeydown(e) {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        this.prevSlide();
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.nextSlide();
        break;
      case ' ':
        e.preventDefault();
        this.isPlaying ? this.pause() : this.play();
        break;
    }
  }

  // Touch handling methods
  handleTouchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.pause();
  }

  handleTouchMove(e) {
    // Only prevent default if it's clearly a horizontal swipe
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = Math.abs(touchX - this.touchStartX);
    const deltaY = Math.abs(touchY - this.touchStartY);

    // Only prevent vertical scrolling if horizontal movement is significantly more than vertical
    if (deltaX > deltaY && deltaX > 20) {
      e.preventDefault();
    }
  }

  handleTouchEnd(e) {
    this.touchEndX = e.changedTouches[0].clientX;
    this.touchEndY = e.changedTouches[0].clientY;
    this.handleSwipe();

    // Resume autoplay after a delay
    setTimeout(() => {
      if (!this.container.matches(':hover') && !this.container.matches(':focus-within')) {
        this.play();
      }
    }, 3000);
  }

  // Mouse drag handling (for desktop)
  handleMouseDown(e) {
    this.isDragging = true;
    this.touchStartX = e.clientX;
    this.touchStartY = e.clientY;
    this.container.style.cursor = 'grabbing';
    e.preventDefault();
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;
    e.preventDefault();
  }

  handleMouseUp(e) {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.touchEndX = e.clientX;
    this.touchEndY = e.clientY;
    this.container.style.cursor = '';
    this.handleSwipe();
  }

  handleSwipe() {
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = Math.abs(this.touchEndY - this.touchStartY);

    // Only process horizontal swipes
    if (Math.abs(deltaX) < this.minSwipeDistance || deltaY > Math.abs(deltaX)) {
      return;
    }

    if (deltaX > 0) {
      this.prevSlide();
    } else {
      this.nextSlide();
    }
  }

  // Utility methods
  isMobile() {
    return window.innerWidth <= 768 || 'ontouchstart' in window;
  }

  getScreenSize() {
    const width = window.innerWidth;
    if (width <= 480) return 'xs';
    if (width <= 768) return 'sm';
    if (width <= 1024) return 'md';
    if (width <= 1440) return 'lg';
    return 'xl';
  }

  adjustForScreenSize() {
    const screenSize = this.getScreenSize();
    const carousel = this.container;
    
    // Adjust autoplay interval based on screen size
    switch (screenSize) {
      case 'xs':
        this.intervalDuration = 6000; // Slower on mobile for better UX
        break;
      case 'sm':
        this.intervalDuration = 5500;
        break;
      default:
        this.intervalDuration = 5000;
    }
    
    // Restart autoplay with new interval if currently playing
    if (this.isPlaying && this.interval) {
      this.pause();
      this.play();
    }
  }

  destroy() {
    this.pause();
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    // Remove event listeners if needed
  }
}

// Initialize carousel when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  const carouselContainer = document.querySelector('.hero-carousel');
  if (carouselContainer) {
    new HeroCarousel(carouselContainer);
  }
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HeroCarousel;
}