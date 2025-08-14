// Gallery functionality for scene image management
console.log('Gallery.js loaded');

document.addEventListener('DOMContentLoaded', function () {
    console.log('Gallery.js DOM ready');
    initializeGallery();
});

function initializeGallery() {
    console.log('Initializing gallery...');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    console.log('Upload button:', uploadBtn);
    console.log('Upload area:', uploadArea);
    console.log('File input:', fileInput);

    if (!uploadBtn || !uploadArea || !fileInput) {
        console.error('Missing required elements');
        return;
    }

    // Toggle upload area
    uploadBtn.addEventListener('click', function () {
        const isHidden = uploadArea.classList.contains('hidden');
        if (isHidden) {
            uploadArea.classList.remove('hidden');
            uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            uploadArea.classList.add('hidden');
        }
    });

    // File input handling
    uploadArea.addEventListener('click', function () {
        fileInput.click();
    });

    fileInput.addEventListener('change', function (e) {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadArea.classList.add('border-blue-400', 'bg-blue-50');
    });

    uploadArea.addEventListener('dragleave', function (e) {
        e.preventDefault();
        uploadArea.classList.remove('border-blue-400', 'bg-blue-50');
    });

    uploadArea.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadArea.classList.remove('border-blue-400', 'bg-blue-50');
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    // Initialize edit form
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditFormSubmit);
    }

    // Close modals when clicking outside
    window.addEventListener('click', function (e) {
        const editModal = document.getElementById('editModal');
        const lightboxModal = document.getElementById('lightboxModal');

        if (e.target === editModal) closeEditModal();
        if (e.target === lightboxModal) closeLightbox();
    });

    // Close with Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (!document.getElementById('editModal').classList.contains('hidden')) closeEditModal();
            if (!document.getElementById('lightboxModal').classList.contains('hidden')) closeLightbox();
        }
    });
}

function handleFiles(files) {
    if (files.length === 0) return;

    const validFiles = [];
    for (let file of files) {
        if (file.type.startsWith('image/')) {
            if (file.size <= 10 * 1024 * 1024) {
                validFiles.push(file);
            } else {
                showAlert('error', `File ${file.name} is too large (max 10MB)`);
            }
        } else {
            showAlert('error', `File ${file.name} is not a valid image`);
        }
    }

    if (validFiles.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < validFiles.length; i++) {
        formData.append('images', validFiles[i]);
    }

    const loading = document.getElementById('loading');
    const uploadArea = document.getElementById('uploadArea');

    if (loading) loading.classList.remove('hidden');
    if (uploadArea) uploadArea.classList.add('hidden');

    const sceneId = window.SCENE_ID;
    const csrfToken = window.CSRF_TOKEN;

    if (!sceneId) {
        showAlert('error', 'Scene ID not found');
        return;
    }

    fetch(`/api/scene/${sceneId}/upload-images/`, {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': csrfToken }
    })
        .then(response => response.json())
        .then(data => {
            if (loading) loading.classList.add('hidden');
            if (data.success) {
                showAlert('success', data.message);
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showAlert('error', data.error || 'Upload failed');
            }
        })
        .catch(error => {
            if (loading) loading.classList.add('hidden');
            showAlert('error', 'Upload failed: ' + error.message);
        });
}

let currentEditingImageId = null;

function editImage(imageId) {
    currentEditingImageId = imageId;
    const sceneId = window.SCENE_ID;

    fetch(`/api/scene/${sceneId}/images/`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const image = data.images.find(img => img.id == imageId);
                if (image) {
                    document.getElementById('editCaption').value = image.caption || '';
                    document.getElementById('editAltText').value = image.alt_text || '';
                    document.getElementById('editDescription').value = image.description || '';
                    document.getElementById('editIsPrimary').checked = image.is_primary;
                    document.getElementById('editModal').classList.remove('hidden');
                }
            }
        })
        .catch(error => showAlert('error', 'Failed to load image data'));
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    currentEditingImageId = null;
}

function handleEditFormSubmit(e) {
    e.preventDefault();
    if (!currentEditingImageId) return;

    const formData = new FormData(e.target);
    const data = {
        caption: formData.get('caption'),
        alt_text: formData.get('alt_text'),
        description: formData.get('description'),
        is_primary: formData.get('is_primary') === 'on'
    };

    const csrfToken = window.CSRF_TOKEN;

    fetch(`/api/image/${currentEditingImageId}/update/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('success', 'Image updated successfully');
                closeEditModal();
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showAlert('error', data.error || 'Failed to update image');
            }
        })
        .catch(error => showAlert('error', 'Failed to update image'));
}

function setPrimary(imageId) {
    const csrfToken = window.CSRF_TOKEN;

    fetch(`/api/image/${imageId}/update/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify({ is_primary: true })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('success', 'Primary image updated');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showAlert('error', data.error || 'Failed to set primary image');
            }
        })
        .catch(error => showAlert('error', 'Failed to set primary image'));
}

function deleteImage(imageId) {
    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) return;

    const csrfToken = window.CSRF_TOKEN;

    fetch(`/api/image/${imageId}/delete/`, {
        method: 'DELETE',
        headers: { 'X-CSRFToken': csrfToken }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('success', 'Image deleted successfully');
                const imageCard = document.querySelector(`[data-image-id="${imageId}"]`);
                if (imageCard) imageCard.remove();
                if (document.querySelectorAll('[data-image-id]').length === 0) {
                    setTimeout(() => window.location.reload(), 1000);
                }
            } else {
                showAlert('error', data.error || 'Failed to delete image');
            }
        })
        .catch(error => showAlert('error', 'Failed to delete image'));
}

function openLightbox(imageUrl, caption) {
    const modal = document.getElementById('lightboxModal');
    const modalImage = document.getElementById('lightboxImage');
    const modalCaption = document.getElementById('lightboxCaption');

    if (modal && modalImage && modalCaption) {
        modalImage.src = imageUrl;
        modalCaption.textContent = caption || '';
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeLightbox() {
    const modal = document.getElementById('lightboxModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

function showAlert(type, message) {
    const alertElement = document.getElementById(type === 'success' ? 'alertSuccess' : 'alertError');
    if (alertElement) {
        alertElement.textContent = message;
        alertElement.classList.remove('hidden');
        alertElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => alertElement.classList.add('hidden'), 5000);
    }
}

// Initialize sortable functionality
function initializeSortable() {
    const imageGrid = document.getElementById('imageGrid');
    if (!imageGrid) return;

    let draggedElement = null;

    // Add drag event listeners to all image cards
    const imageCards = imageGrid.querySelectorAll('[data-image-id]');
    imageCards.forEach(card => {
        card.draggable = true;

        card.addEventListener('dragstart', function (e) {
            draggedElement = this;
            this.classList.add('opacity-50');
            e.dataTransfer.effectAllowed = 'move';
        });

        card.addEventListener('dragend', function () {
            this.classList.remove('opacity-50');
            draggedElement = null;
        });

        card.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        card.addEventListener('drop', function (e) {
            e.preventDefault();
            if (draggedElement && draggedElement !== this) {
                // Swap positions
                const draggedOrder = parseInt(draggedElement.dataset.order);
                const targetOrder = parseInt(this.dataset.order);

                // Update DOM
                if (draggedOrder < targetOrder) {
                    this.parentNode.insertBefore(draggedElement, this.nextSibling);
                } else {
                    this.parentNode.insertBefore(draggedElement, this);
                }

                // Update order values
                updateImageOrder();
            }
        });
    });
}

function updateImageOrder() {
    const imageCards = document.querySelectorAll('[data-image-id]');
    const imageOrders = [];

    imageCards.forEach((card, index) => {
        const imageId = parseInt(card.dataset.imageId);
        imageOrders.push({
            id: imageId,
            order: index
        });
        card.dataset.order = index;
    });

    const sceneId = window.SCENE_ID;
    const csrfToken = window.CSRF_TOKEN;

    // Send update to server
    fetch(`/api/scene/${sceneId}/update-image-order/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
            image_orders: imageOrders
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('success', 'Image order updated');
            } else {
                showAlert('error', data.error || 'Failed to update order');
            }
        })
        .catch(error => {
            showAlert('error', 'Failed to update order: ' + error.message);
        });
}

// Initialize sortable when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(initializeSortable, 100); // Small delay to ensure images are loaded
});