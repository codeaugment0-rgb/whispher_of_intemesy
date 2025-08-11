// Advanced Analytics Filters and Real-time Updates
class AnalyticsFilters {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.filters = {
      country: 'all',
      setting: 'all',
      emotion: 'all',
      ageRange: 'all',
      dateRange: 'all'
    };

    this.init();
  }

  init() {
    this.createFilterUI();
    this.setupFilterListeners();
  }

  createFilterUI() {
    console.log('Creating filter UI...');
    const filtersContainer = document.createElement('div');
    filtersContainer.className = 'analytics-filters bg-white rounded-xl p-6 mb-8';
    filtersContainer.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Filters</h3>
        <button id="clear-filters" class="text-sm text-gray-600 hover:text-gray-900 transition-colors">
          Clear All Filters
        </button>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Country</label>
          <select id="country-filter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
            <option value="all">All Countries</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Setting</label>
          <select id="setting-filter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
            <option value="all">All Settings</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Emotion</label>
          <select id="emotion-filter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
            <option value="all">All Emotions</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Age Range</label>
          <select id="age-range-filter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
            <option value="all">All Ages</option>
            <option value="18-25">18-25</option>
            <option value="26-35">26-35</option>
            <option value="36-45">36-45</option>
            <option value="46-55">46-55</option>
            <option value="55+">55+</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Actions</label>
          <button id="apply-filters" class="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
            Apply Filters
          </button>
        </div>
      </div>
    `;

    // Insert filters into the designated container
    const filtersContainer_target = document.getElementById('filters-container');
    if (filtersContainer_target) {
      filtersContainer_target.appendChild(filtersContainer);
      console.log('Filter UI inserted into filters-container');
    } else {
      // Fallback: insert before the main analytics content
      const analyticsContent = document.getElementById('analytics-content');
      if (analyticsContent) {
        analyticsContent.insertBefore(filtersContainer, analyticsContent.firstChild);
        console.log('Filter UI inserted as fallback');
      } else {
        console.error('Could not find container for filters');
      }
    }
  }

  setupFilterListeners() {
    // Clear filters button
    document.getElementById('clear-filters')?.addEventListener('click', () => {
      this.clearAllFilters();
    });

    // Apply filters button
    document.getElementById('apply-filters')?.addEventListener('click', () => {
      this.applyFilters();
    });

    // Individual filter changes
    ['country-filter', 'setting-filter', 'emotion-filter', 'age-range-filter'].forEach(filterId => {
      document.getElementById(filterId)?.addEventListener('change', (e) => {
        const filterType = filterId.replace('-filter', '').replace('-', '');
        this.filters[filterType] = e.target.value;
      });
    });
  }

  populateFilterOptions(data) {
    console.log('Populating filter options with data:', data);
    
    // ALWAYS use filters data which contains ALL options
    const filtersData = data.filters;
    
    if (!filtersData) {
      console.error('No filters data available');
      return;
    }

    // Populate country options
    const countryFilter = document.getElementById('country-filter');
    if (countryFilter) {
      // Clear existing options except "All Countries"
      const allOption = countryFilter.querySelector('option[value="all"]');
      countryFilter.innerHTML = '';
      if (allOption) {
        countryFilter.appendChild(allOption);
      } else {
        const defaultOption = document.createElement('option');
        defaultOption.value = 'all';
        defaultOption.textContent = 'All Countries';
        countryFilter.appendChild(defaultOption);
      }

      // Get country data - should always be an array
      let countries = filtersData.countries || [];
      console.log('Countries for filter:', countries);

      // Add country options
      countries.forEach(country => {
        if (country && country.trim()) { // Check for valid country name
          const option = document.createElement('option');
          option.value = country;
          option.textContent = country;
          countryFilter.appendChild(option);
        }
      });
    }

    // Populate setting options
    const settingFilter = document.getElementById('setting-filter');
    if (settingFilter) {
      // Clear existing options except "All Settings"
      const allOption = settingFilter.querySelector('option[value="all"]');
      settingFilter.innerHTML = '';
      if (allOption) {
        settingFilter.appendChild(allOption);
      } else {
        const defaultOption = document.createElement('option');
        defaultOption.value = 'all';
        defaultOption.textContent = 'All Settings';
        settingFilter.appendChild(defaultOption);
      }

      // Get setting data - should always be an array
      let settings = filtersData.settings || [];
      console.log('Settings for filter:', settings);

      // Add setting options
      settings.forEach(setting => {
        if (setting && setting.trim()) { // Check for valid setting name
          const option = document.createElement('option');
          option.value = setting;
          option.textContent = setting;
          settingFilter.appendChild(option);
        }
      });
    }

    // Populate emotion options
    const emotionFilter = document.getElementById('emotion-filter');
    if (emotionFilter) {
      // Clear existing options except "All Emotions"
      const allOption = emotionFilter.querySelector('option[value="all"]');
      emotionFilter.innerHTML = '';
      if (allOption) {
        emotionFilter.appendChild(allOption);
      } else {
        const defaultOption = document.createElement('option');
        defaultOption.value = 'all';
        defaultOption.textContent = 'All Emotions';
        emotionFilter.appendChild(defaultOption);
      }

      // Get emotion data - should always be an array
      let emotions = filtersData.emotions || [];
      console.log('Emotions for filter:', emotions);

      // Add emotion options
      emotions.forEach(emotion => {
        if (emotion && emotion.trim()) { // Check for valid emotion name
          const option = document.createElement('option');
          option.value = emotion;
          option.textContent = emotion;
          emotionFilter.appendChild(option);
        }
      });
    }
  }

  clearAllFilters() {
    this.filters = {
      country: 'all',
      setting: 'all',
      emotion: 'all',
      ageRange: 'all',
      dateRange: 'all'
    };

    // Reset select elements
    const countryFilter = document.getElementById('country-filter');
    const settingFilter = document.getElementById('setting-filter');
    const emotionFilter = document.getElementById('emotion-filter');
    const ageRangeFilter = document.getElementById('age-range-filter');

    if (countryFilter) countryFilter.value = 'all';
    if (settingFilter) settingFilter.value = 'all';
    if (emotionFilter) emotionFilter.value = 'all';
    if (ageRangeFilter) ageRangeFilter.value = 'all';

    // Reload analytics with no filters
    this.dashboard.loadAnalytics();
  }



  async applyFilters() {
    // Show loading state
    this.dashboard.showLoading();

    try {
      // Build flexible query parameters
      const params = {};
      
      // Add filter parameters
      Object.keys(this.filters).forEach(key => {
        if (this.filters[key] !== 'all' && this.filters[key]) {
          params[key] = this.filters[key];
        }
      });

      // Add chart limit parameter (get from UI if available) - Default to 0 (show all)
      const chartLimit = document.getElementById('chart-limit')?.value || 0;
      params.chart_limit = parseInt(chartLimit);

      // Use the dashboard's flexible loadAnalytics method
      await this.dashboard.loadAnalytics(params);

      // Show success message
      const filterCount = Object.keys(params).filter(key => key !== 'chart_limit').length;
      if (filterCount > 0) {
        this.dashboard.showToast(`${filterCount} filter(s) applied successfully!`, 'success');
      } else {
        this.dashboard.showToast('All filters cleared!', 'info');
      }

    } catch (error) {
      console.error('Error applying filters:', error);
      this.dashboard.showError(error.message);
    }
  }

  getActiveFilters() {
    return Object.keys(this.filters).filter(key => this.filters[key] !== 'all');
  }

  hasActiveFilters() {
    return this.getActiveFilters().length > 0;
  }
}

// Real-time Analytics Updates
class RealTimeAnalytics {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.updateInterval = null;
    this.isEnabled = false;

    this.init();
  }

  init() {
    this.createRealTimeUI();
    this.setupRealTimeListeners();
  }

  createRealTimeUI() {
    const realTimeContainer = document.createElement('div');
    realTimeContainer.className = 'real-time-controls flex items-center space-x-4 mb-4';
    realTimeContainer.innerHTML = `
      <div class="flex items-center space-x-2">
        <input type="checkbox" id="real-time-toggle" class="rounded border-gray-300 text-primary focus:ring-primary">
        <label for="real-time-toggle" class="text-sm font-medium text-gray-700">
          Real-time Updates
        </label>
      </div>
      
      <div class="flex items-center space-x-2">
        <label for="update-interval" class="text-sm text-gray-600">Update every:</label>
        <select id="update-interval" class="px-2 py-1 border border-gray-300 rounded text-sm">
          <option value="5000">5 seconds</option>
          <option value="10000" selected>10 seconds</option>
          <option value="30000">30 seconds</option>
          <option value="60000">1 minute</option>
        </select>
      </div>
      
      <div id="last-updated" class="text-xs text-gray-500">
        Last updated: Never
      </div>
    `;

    // Insert real-time controls in the header
    const headerDiv = document.querySelector('.analytics-dashboard .mb-8');
    if (headerDiv) {
      headerDiv.appendChild(realTimeContainer);
    }
  }

  setupRealTimeListeners() {
    const toggle = document.getElementById('real-time-toggle');
    const intervalSelect = document.getElementById('update-interval');

    toggle?.addEventListener('change', (e) => {
      if (e.target.checked) {
        this.startRealTimeUpdates();
      } else {
        this.stopRealTimeUpdates();
      }
    });

    intervalSelect?.addEventListener('change', (e) => {
      if (this.isEnabled) {
        this.stopRealTimeUpdates();
        this.startRealTimeUpdates();
      }
    });
  }

  startRealTimeUpdates() {
    this.isEnabled = true;
    const interval = parseInt(document.getElementById('update-interval').value);

    this.updateInterval = setInterval(() => {
      this.dashboard.loadAnalytics();
      this.updateLastUpdatedTime();
    }, interval);

    this.dashboard.showToast('Real-time updates enabled', 'success');
  }

  stopRealTimeUpdates() {
    this.isEnabled = false;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.dashboard.showToast('Real-time updates disabled', 'info');
  }

  updateLastUpdatedTime() {
    const lastUpdated = document.getElementById('last-updated');
    if (lastUpdated) {
      lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }
  }
}

// Export classes for use in main analytics
window.AnalyticsFilters = AnalyticsFilters;
window.RealTimeAnalytics = RealTimeAnalytics;