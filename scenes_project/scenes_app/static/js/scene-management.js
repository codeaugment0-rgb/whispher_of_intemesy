// Scene Management JavaScript
class SceneManager {
  constructor() {
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Quick edit functionality
    document.addEventListener('click', (e) => {
      if (e.target.closest('.quick-edit-btn')) {
        e.preventDefault();
        const sceneId = e.target.closest('.quick-edit-btn').dataset.sceneId;
        this.showQuickEditModal(sceneId);
      }
    });

    // Quick delete functionality
    document.addEventListener('click', (e) => {
      if (e.target.closest('.quick-delete-btn')) {
        e.preventDefault();
        const sceneId = e.target.closest('.quick-delete-btn').dataset.sceneId;
        const sceneTitle = e.target.closest('.quick-delete-btn').dataset.sceneTitle;
        this.confirmDelete(sceneId, sceneTitle);
      }
    });

    // Bulk operations
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('scene-checkbox')) {
        this.updateBulkActions();
      }
    });
  }

  async showQuickEditModal(sceneId) {
    try {
      // Create modal overlay
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-2xl font-bold text-gray-900">Quick Edit Scene</h3>
            <button class="close-modal text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div id="quick-edit-form">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p class="text-center text-gray-600 mt-2">Loading scene data...</p>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Close modal functionality
      modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });

      // Load scene data and create form
      await this.loadQuickEditForm(sceneId, modal);

    } catch (error) {
      console.error('Error showing quick edit modal:', error);
      this.showToast('Error loading edit form', 'error');
    }
  }

  async loadQuickEditForm(sceneId, modal) {
    try {
      // In a real implementation, you'd fetch scene data from an API
      // For now, we'll create a basic form
      const formContainer = modal.querySelector('#quick-edit-form');
      
      formContainer.innerHTML = `
        <form id="scene-quick-edit" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" name="title" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input type="text" name="country" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Setting</label>
              <input type="text" name="setting" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Emotion</label>
              <input type="text" name="emotion" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Effeminate Age</label>
              <input type="number" name="effeminate_age" min="18" max="100" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Masculine Age</label>
              <input type="number" name="masculine_age" min="18" max="100" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
            </div>
          </div>
          
          <div class="flex items-center justify-end space-x-4 pt-4">
            <button type="button" class="close-modal px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Save Changes
            </button>
          </div>
        </form>
      `;

      // Handle form submission
      const form = formContainer.querySelector('#scene-quick-edit');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.saveQuickEdit(sceneId, form, modal);
      });

    } catch (error) {
      console.error('Error loading quick edit form:', error);
      this.showToast('Error loading form data', 'error');
    }
  }

  async saveQuickEdit(sceneId, form, modal) {
    try {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      const response = await fetch(`/api/scene/${sceneId}/update/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCsrfToken()
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.status === 'success') {
        this.showToast('Scene updated successfully!', 'success');
        document.body.removeChild(modal);
        // Refresh the page or update the scene card
        window.location.reload();
      } else {
        throw new Error(result.message || 'Failed to update scene');
      }

    } catch (error) {
      console.error('Error saving scene:', error);
      this.showToast('Error saving changes: ' + error.message, 'error');
    }
  }

  async confirmDelete(sceneId, sceneTitle) {
    // Create a more elegant confirmation modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">Delete Scene</h3>
          <p class="text-gray-600 mb-6">Are you sure you want to delete "<strong>${sceneTitle}</strong>"? This action cannot be undone.</p>
          
          <div class="flex items-center justify-center space-x-4">
            <button class="cancel-delete px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors">
              Cancel
            </button>
            <button class="confirm-delete px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Delete Scene
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle modal interactions
    const cancelBtn = modal.querySelector('.cancel-delete');
    const confirmBtn = modal.querySelector('.confirm-delete');

    const closeModal = () => {
      document.body.removeChild(modal);
    };

    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    confirmBtn.addEventListener('click', async () => {
      try {
        confirmBtn.innerHTML = `
          <svg class="w-4 h-4 mr-2 animate-spin inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          Deleting...
        `;
        confirmBtn.disabled = true;

        const response = await fetch(`/api/scene/${sceneId}/delete/`, {
          method: 'DELETE',
          headers: {
            'X-CSRFToken': this.getCsrfToken()
          }
        });

        const result = await response.json();

        if (result.status === 'success') {
          this.showToast('Scene deleted successfully!', 'success');
          closeModal();
          
          // Remove the scene card from the page with animation
          const sceneCard = document.querySelector(`[data-scene-id="${sceneId}"]`)?.closest('article');
          if (sceneCard) {
            sceneCard.style.transition = 'all 0.3s ease-out';
            sceneCard.style.transform = 'scale(0.95)';
            sceneCard.style.opacity = '0';
            setTimeout(() => {
              sceneCard.remove();
              // If no more scenes, show empty state or reload
              const remainingCards = document.querySelectorAll('article.scene-card');
              if (remainingCards.length === 0) {
                window.location.reload();
              }
            }, 300);
          }
        } else {
          throw new Error(result.message || 'Failed to delete scene');
        }

      } catch (error) {
        console.error('Error deleting scene:', error);
        this.showToast('Error deleting scene: ' + error.message, 'error');
        closeModal();
      }
    });
  }

  updateBulkActions() {
    const checkboxes = document.querySelectorAll('.scene-checkbox:checked');
    const bulkActions = document.getElementById('bulk-actions');
    
    if (checkboxes.length > 0) {
      if (bulkActions) {
        bulkActions.classList.remove('hidden');
        bulkActions.querySelector('.selected-count').textContent = checkboxes.length;
      }
    } else {
      if (bulkActions) {
        bulkActions.classList.add('hidden');
      }
    }
  }

  getCsrfToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
           document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  }

  showToast(message, type = 'info') {
    if (typeof Toastify !== 'undefined') {
      const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#6366f1'
      };
      
      Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: colors[type] || colors.info,
      }).showToast();
    } else {
      // Fallback to alert if Toastify is not available
      alert(message);
    }
  }
}

// Initialize scene management when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  new SceneManager();
});

// Export for global access
window.SceneManager = SceneManager;