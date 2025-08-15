// lightBox.js - COMPLETE AND REUSABLE VERSION

const Lightbox = {
    // --- State Variables ---
    imageList: [],
    currentImageIndex: 0,
    currentZoom: 1,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    imagePosition: { x: 0, y: 0 },
    touchStart: null,
    lastTouchDistance: 0,

    // --- DOM Element References ---
    modal: null,
    imageElement: null,
    loader: null,
    container: null,

    // --- Initialization ---
    init() {
        this.modal = document.getElementById('lightboxModal');
        if (!this.modal) return; // Don't run if the lightbox isn't on the page

        // Find all required elements
        this.imageElement = document.getElementById('lightboxImage');
        this.loader = document.getElementById('imageLoader');
        this.container = document.getElementById('imageContainer');

        // Make the Lightbox object globally accessible (e.g., for onclick attributes)
        window.Lightbox = this;

        this.initializeImageViewer();
        console.log('Central Lightbox Initialized.');
    },

    // --- Public Methods ---
    open(clickedImageId) {
        this.buildImageList();
        
        const index = this.imageList.findIndex(img => img.id == clickedImageId);
        this.currentImageIndex = (index !== -1) ? index : 0;

        this.modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', this.handleKeydown.bind(this));

        this.loadCurrentImage();
        this.showKeyboardHelp();
        
        // Add click outside to close functionality
        this.modal.addEventListener('click', this.handleModalClick.bind(this));
    },

    close() {
        this.modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        document.removeEventListener('keydown', this.handleKeydown.bind(this));
        this.modal.removeEventListener('click', this.handleModalClick.bind(this));
        this.resetZoom(); // Reset zoom when closing
    },

    // --- Image Loading and Navigation ---
    buildImageList() {
        this.imageList = [];
        const imageGrid = document.getElementById('imageGrid');
        if (!imageGrid) return;
        
        const imageCards = imageGrid.querySelectorAll('[data-image-id]');
        imageCards.forEach(card => {
            const img = card.querySelector('img');
            const imageId = card.getAttribute('data-image-id');
            if (img && imageId) {
                this.imageList.push({
                    id: imageId,
                    largeUrl: img.dataset.largeUrl || img.src.replace('/medium/', '/large/'),
                    caption: img.alt || 'Untitled',
                    width: img.dataset.width || 'Unknown',
                    height: img.dataset.height || 'Unknown', 
                    fileSize: img.dataset.fileSize || 'Unknown'
                });
            }
        });
    },

    loadCurrentImage() {
        if (this.imageList.length === 0) return;
        const currentImage = this.imageList[this.currentImageIndex];
        
        this.loader.classList.remove('hidden');
        this.resetZoom();

        const img = new Image();
        img.onload = () => {
            this.imageElement.src = img.src;
            this.updateImageInfo(currentImage);
            this.loader.classList.add('hidden');
            
            // Preload adjacent images for better performance
            this.preloadAdjacentImages();
        };
        img.onerror = () => {
            console.error("Failed to load large image, falling back.");
            this.imageElement.src = currentImage.largeUrl.replace('/large/', '/medium/'); // Fallback
            this.updateImageInfo(currentImage);
            this.loader.classList.add('hidden');
        };
        img.src = currentImage.largeUrl;
    },

    preloadAdjacentImages() {
        // Preload previous image
        if (this.currentImageIndex > 0) {
            const prevImage = new Image();
            prevImage.src = this.imageList[this.currentImageIndex - 1].largeUrl;
        }
        
        // Preload next image
        if (this.currentImageIndex < this.imageList.length - 1) {
            const nextImage = new Image();
            nextImage.src = this.imageList[this.currentImageIndex + 1].largeUrl;
        }
    },

    updateImageInfo(image) {
        document.getElementById('lightboxCaption').textContent = image.caption;
        document.getElementById('imageCounter').textContent = `${this.currentImageIndex + 1} / ${this.imageList.length}`;
        
        // Update image dimensions and file size
        const dimensionsEl = document.getElementById('imageDimensions');
        const sizeEl = document.getElementById('imageSize');
        
        if (dimensionsEl && image.width && image.height) {
            dimensionsEl.textContent = `${image.width} × ${image.height}`;
        }
        
        if (sizeEl && image.fileSize) {
            sizeEl.textContent = image.fileSize;
        }
        
        const prevBtn = document.getElementById('prevImageBtn');
        const nextBtn = document.getElementById('nextImageBtn');
        
        prevBtn.disabled = this.currentImageIndex === 0;
        nextBtn.disabled = this.currentImageIndex === this.imageList.length - 1;
        
        // Update button visibility for single image
        if (this.imageList.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'flex';
            nextBtn.style.display = 'flex';
        }
    },

    navigateImage(direction) {
        const newIndex = this.currentImageIndex + direction;
        if (newIndex >= 0 && newIndex < this.imageList.length) {
            this.currentImageIndex = newIndex;
            this.loadCurrentImage();
        }
    },

    // --- Zoom and Pan Functionality ---
    zoomImage(delta) {
        const newZoom = Math.max(0.5, Math.min(3, this.currentZoom + delta));
        if (newZoom !== this.currentZoom) {
            this.currentZoom = newZoom;
            this.updateImageTransform();
        }
    },

    resetZoom() {
        this.currentZoom = 1;
        this.imagePosition = { x: 0, y: 0 };
        this.updateImageTransform();
    },

    updateImageTransform() {
        this.imageElement.style.transform = `scale(${this.currentZoom}) translate(${this.imagePosition.x}px, ${this.imagePosition.y}px)`;
        this.container.style.cursor = this.currentZoom > 1 ? 'grab' : '';
        
        const zoomLevelEl = document.getElementById('zoomLevel');
        if (zoomLevelEl) {
            zoomLevelEl.textContent = `${Math.round(this.currentZoom * 100)}%`;
        }
        
        // Constrain pan position when zoomed
        if (this.currentZoom > 1) {
            this.constrainPanPosition();
        }
    },

    constrainPanPosition() {
        // Prevent panning too far outside the viewport
        const containerRect = this.container.getBoundingClientRect();
        const imageRect = this.imageElement.getBoundingClientRect();
        
        const maxX = Math.max(0, (imageRect.width - containerRect.width) / 2);
        const maxY = Math.max(0, (imageRect.height - containerRect.height) / 2);
        
        this.imagePosition.x = Math.max(-maxX, Math.min(maxX, this.imagePosition.x));
        this.imagePosition.y = Math.max(-maxY, Math.min(maxY, this.imagePosition.y));
    },

    // --- Event Handlers (Mouse, Touch, Keyboard) ---
    initializeImageViewer() {
        // Enhanced wheel zoom with better precision
        this.container.addEventListener('wheel', e => { 
            e.preventDefault(); 
            const zoomDelta = e.deltaY > 0 ? -0.15 : 0.15;
            this.zoomImage(zoomDelta);
        }, { passive: false });
        
        // Double-click to toggle zoom
        this.container.addEventListener('dblclick', () => {
            if (this.currentZoom === 1) {
                this.zoomImage(1); // Zoom to 2x
            } else {
                this.resetZoom(); // Reset to 1x
            }
        });
        
        // Drag to pan
        this.container.addEventListener('mousedown', this.startDrag.bind(this));
        this.container.addEventListener('mousemove', this.drag.bind(this));
        this.container.addEventListener('mouseup', this.endDrag.bind(this));
        this.container.addEventListener('mouseleave', this.endDrag.bind(this));

        // Touch events for mobile
        this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    },

    startDrag(e) {
        if (this.currentZoom <= 1) return;
        this.isDragging = true;
        this.dragStart = { x: e.clientX - this.imagePosition.x, y: e.clientY - this.imagePosition.y };
        this.container.style.cursor = 'grabbing';
    },

    drag(e) {
        if (!this.isDragging || this.currentZoom <= 1) return;
        e.preventDefault();
        this.imagePosition.x = e.clientX - this.dragStart.x;
        this.imagePosition.y = e.clientY - this.dragStart.y;
        this.updateImageTransform();
    },

    endDrag() {
        this.isDragging = false;
        this.container.style.cursor = this.currentZoom > 1 ? 'grab' : '';
    },

    handleTouchStart(e) {
        if (e.touches.length === 1 && this.currentZoom > 1) {
            this.touchStart = { x: e.touches[0].clientX - this.imagePosition.x, y: e.touches[0].clientY - this.imagePosition.y };
        } else if (e.touches.length === 2) {
            this.lastTouchDistance = this.getTouchDistance(e.touches);
        }
    },

    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1 && this.touchStart) {
            this.imagePosition.x = e.touches[0].clientX - this.touchStart.x;
            this.imagePosition.y = e.touches[0].clientY - this.touchStart.y;
            this.updateImageTransform();
        } else if (e.touches.length === 2) {
            const distance = this.getTouchDistance(e.touches);
            const scale = distance / this.lastTouchDistance;
            this.zoomImage((scale - 1) * 0.5);
            this.lastTouchDistance = distance;
        }
    },

    handleTouchEnd() {
        this.touchStart = null;
    },

    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    },

    handleKeydown(e) {
        // Prevent default behavior for handled keys
        const handledKeys = ['Escape', 'ArrowLeft', 'ArrowRight', '+', '=', '-', '0', ' '];
        if (handledKeys.includes(e.key)) {
            e.preventDefault();
        }

        switch (e.key) {
            case 'Escape': 
                this.close(); 
                break;
            case 'ArrowLeft': 
                this.navigateImage(-1); 
                break;
            case 'ArrowRight': 
            case ' ': // Spacebar also navigates forward
                this.navigateImage(1); 
                break;
            case '+': 
            case '=': 
                this.zoomImage(0.2); 
                break;
            case '-': 
                this.zoomImage(-0.2); 
                break;
            case '0': 
                this.resetZoom(); 
                break;
            case 'f': 
            case 'F':
                // Toggle fullscreen if available
                this.toggleFullscreen();
                break;
        }
    },

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.modal.requestFullscreen?.() || 
            this.modal.webkitRequestFullscreen?.() || 
            this.modal.mozRequestFullScreen?.();
        } else {
            document.exitFullscreen?.() || 
            document.webkitExitFullscreen?.() || 
            document.mozCancelFullScreen?.();
        }
    },
    
    // --- UI Helpers ---
    showKeyboardHelp() {
        const help = document.getElementById('keyboardHelp');
        if (!help) return;
        help.style.opacity = '1';
        setTimeout(() => { help.style.opacity = '0'; }, 3000);
    },

    handleModalClick(e) {
        // Close lightbox when clicking on the modal background (not on the image or controls)
        if (e.target === this.modal || e.target.id === 'imageContainer') {
            this.close();
        }
    }
};

// Auto-initialize the lightbox script when the page DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Lightbox.init();
});