// Analytics Dashboard JavaScript
class AnalyticsDashboard {
  constructor() {
    this.analyticsData = null;
    this.charts = {};
    this.colorSchemes = {
      primary: ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#f97316', '#06b6d4', '#84cc16'],
      secondary: ['#a5b4fc', '#c4b5fd', '#fbbf24', '#34d399', '#f87171', '#fb923c', '#67e8f9', '#a3e635']
    };

    this.filters = null;
    this.realTime = null;
    this.comparison = null;
    this.insights = null;

    this.init();
  }

  init() {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
      console.error('Chart.js is not loaded! Charts will not work.');
      this.showError('Chart.js library is not loaded. Please refresh the page.');
      return;
    }

    console.log('Chart.js version:', Chart.version);

    this.setupEventListeners();
    this.loadAnalytics();

    // Initialize advanced features after initial load
    setTimeout(() => {
      console.log('Initializing advanced analytics features...');

      if (window.AnalyticsFilters) {
        console.log('Initializing filters...');
        this.filters = new window.AnalyticsFilters(this);
        // If we already have data, populate the filters
        if (this.analyticsData) {
          setTimeout(() => {
            this.filters.populateFilterOptions(this.analyticsData);
          }, 200);
        }
      } else {
        console.warn('AnalyticsFilters not available');
      }

      if (window.RealTimeAnalytics) {
        console.log('Initializing real-time analytics...');
        this.realTime = new window.RealTimeAnalytics(this);
      } else {
        console.warn('RealTimeAnalytics not available');
      }

      if (window.AnalyticsComparison) {
        console.log('Initializing comparison...');
        this.comparison = new window.AnalyticsComparison(this);
      } else {
        console.warn('AnalyticsComparison not available');
      }

      if (window.AnalyticsInsights) {
        console.log('Initializing insights...');
        this.insights = new window.AnalyticsInsights(this);
      } else {
        console.warn('AnalyticsInsights not available');
      }

      console.log('Advanced features initialization complete');
    }, 1000);
  }

  setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-analytics');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        console.log('Refresh button clicked');
        // Get current chart limit if available - Default to 0 (show all)
        const chartLimit = document.getElementById('chart-limit')?.value || 0;
        this.loadAnalytics({ chart_limit: parseInt(chartLimit) });

        // Force refresh charts after a short delay
        setTimeout(() => {
          this.refreshCharts();
        }, 500);
      });
    }

    // Export button
    const exportBtn = document.getElementById('export-analytics');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportAnalytics());
    }

    // Chart limit selector (if it exists)
    const chartLimitSelect = document.getElementById('chart-limit');
    if (chartLimitSelect) {
      chartLimitSelect.addEventListener('change', (e) => {
        const chartLimit = parseInt(e.target.value);
        this.loadAnalytics({ chart_limit: chartLimit });
      });
    }

    // Chart type buttons
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const chartName = e.target.closest('.chart-type-btn').dataset.chart;
        const chartType = e.target.closest('.chart-type-btn').dataset.type;

        // Update active state
        e.target.closest('.chart-type-btn').parentElement.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
        e.target.closest('.chart-type-btn').classList.add('active');

        // Update chart
        this.updateChartType(chartName, chartType);
      });
    });
  }

  async loadAnalytics(params = {}) {
    this.showLoading();

    try {
      // Build flexible URL with parameters
      const urlParams = new URLSearchParams();

      // Add default parameters - Default to 0 to show ALL data
      urlParams.append('chart_limit', params.chart_limit || 0);

      // Add any additional parameters
      Object.keys(params).forEach(key => {
        if (key !== 'chart_limit' && params[key]) {
          urlParams.append(key, params[key]);
        }
      });

      const url = `/api/analytics/?${urlParams.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      this.analyticsData = data;
      console.log('Analytics data loaded:', data);

      this.updateUI(data);

      // Create charts with a small delay to ensure DOM is ready
      setTimeout(() => {
        this.createCharts(data);
      }, 100);

      this.hideLoading();

      // Populate filter options if filters are available
      if (this.filters) {
        // Add a small delay to ensure filter UI is fully created
        setTimeout(() => {
          this.filters.populateFilterOptions(data);
        }, 200);
      }

      // Show metadata if available
      if (data.metadata) {
        console.log('Analytics metadata:', data.metadata);
      }

      // Show message if no data after filtering
      if (data.message) {
        this.showToast(data.message, 'info');
      }

    } catch (error) {
      console.error('Error loading analytics:', error);
      this.showError(error.message);
    }
  }

  updateUI(data) {
    // Update statistics
    this.updateElement('total-scenes', data.stats.total_scenes);
    this.updateElement('total-favorites', data.stats.total_favorites);
    this.updateElement('avg-effeminate-age', data.stats.avg_effeminate_age);
    this.updateElement('avg-masculine-age', data.stats.avg_masculine_age);

    // Update most favorited scenes
    this.updateMostFavorited(data.most_favorited);

    // Update insights
    if (data.charts.countries.labels.length > 0) {
      this.updateElement('popular-country', data.charts.countries.labels[0]);
    }
    if (data.charts.emotions.labels.length > 0) {
      this.updateElement('popular-emotion', data.charts.emotions.labels[0]);
    }
    if (data.charts.settings.labels.length > 0) {
      this.updateElement('popular-setting', data.charts.settings.labels[0]);
    }
  }

  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  updateMostFavorited(scenes) {
    const container = document.getElementById('most-favorited-scenes');
    if (!container) return;

    if (scenes.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
          </svg>
          <p>No favorited scenes yet</p>
        </div>
      `;
      return;
    }

    container.innerHTML = scenes.map((scene, index) => `
      <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors animate-fadeIn">
        <div class="flex items-center space-x-4">
          <div class="flex-shrink-0">
            <div class="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
              ${index + 1}
            </div>
          </div>
          <div>
            <h4 class="font-medium text-gray-900">${this.escapeHtml(scene.title)}</h4>
            <p class="text-sm text-gray-600">Scene ID: ${scene.id}</p>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <div class="text-right">
            <p class="font-semibold text-gray-900">${scene.favorite_count}</p>
            <p class="text-sm text-gray-600">favorites</p>
          </div>
          <a href="/scene/${scene.id}/" class="text-primary hover:text-primary-dark transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
    `).join('');
  }

  createCharts(data) {
    console.log('Creating charts with data:', data);

    // Destroy existing charts
    Object.values(this.charts).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        try {
          chart.destroy();
        } catch (e) {
          console.warn('Error destroying chart:', e);
        }
      }
    });
    this.charts = {};

    // Validate data structure
    if (!data.charts) {
      console.error('No charts data available');
      return;
    }

    // Create country chart
    if (data.charts.countries && data.charts.countries.labels) {
      if (data.charts.countries.labels.length > 0) {
        console.log('Creating countries chart with:', data.charts.countries);
        this.charts.countries = this.createChart('countries-chart', {
          type: 'doughnut',
          data: {
            labels: data.charts.countries.labels,
            datasets: [{
              data: data.charts.countries.data,
              backgroundColor: this.colorSchemes.primary.slice(0, data.charts.countries.labels.length),
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: this.getChartOptions('doughnut')
        });
      } else {
        // Create empty chart with "No data" message
        console.log('Creating empty countries chart - no data after filtering');
        this.charts.countries = this.createChart('countries-chart', {
          type: 'doughnut',
          data: {
            labels: ['No Data'],
            datasets: [{
              data: [1],
              backgroundColor: ['#e5e7eb'],
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: this.getChartOptions('doughnut')
        });
      }
    } else {
      console.warn('No countries data structure available');
    }

    // Create settings chart
    if (data.charts.settings && data.charts.settings.labels) {
      if (data.charts.settings.labels.length > 0) {
        console.log('Creating settings chart with:', data.charts.settings);
        this.charts.settings = this.createChart('settings-chart', {
          type: 'doughnut',
          data: {
            labels: data.charts.settings.labels,
            datasets: [{
              data: data.charts.settings.data,
              backgroundColor: this.colorSchemes.primary.slice(0, data.charts.settings.labels.length),
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: this.getChartOptions('doughnut')
        });
      } else {
        // Create empty chart with "No data" message
        console.log('Creating empty settings chart - no data after filtering');
        this.charts.settings = this.createChart('settings-chart', {
          type: 'doughnut',
          data: {
            labels: ['No Data'],
            datasets: [{
              data: [1],
              backgroundColor: ['#e5e7eb'],
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: this.getChartOptions('doughnut')
        });
      }
    } else {
      console.warn('No settings data structure available');
    }

    // Create emotions chart
    if (data.charts.emotions && data.charts.emotions.labels) {
      if (data.charts.emotions.labels.length > 0) {
        console.log('Creating emotions chart with:', data.charts.emotions);
        this.charts.emotions = this.createChart('emotions-chart', {
          type: 'doughnut',
          data: {
            labels: data.charts.emotions.labels,
            datasets: [{
              data: data.charts.emotions.data,
              backgroundColor: this.colorSchemes.primary.slice(0, data.charts.emotions.labels.length),
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: this.getChartOptions('doughnut')
        });
      } else {
        // Create empty chart with "No data" message
        console.log('Creating empty emotions chart - no data after filtering');
        this.charts.emotions = this.createChart('emotions-chart', {
          type: 'doughnut',
          data: {
            labels: ['No Data'],
            datasets: [{
              data: [1],
              backgroundColor: ['#e5e7eb'],
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: this.getChartOptions('doughnut')
        });
      }
    } else {
      console.warn('No emotions data structure available');
    }

    // Create age ranges chart
    if (data.charts.age_ranges && data.charts.age_ranges.labels) {
      if (data.charts.age_ranges.labels.length > 0) {
        console.log('Creating age ranges chart with:', data.charts.age_ranges);
        this.charts['age-ranges'] = this.createChart('age-ranges-chart', {
          type: 'bar',
          data: {
            labels: data.charts.age_ranges.labels,
            datasets: [{
              label: 'Number of Scenes',
              data: data.charts.age_ranges.data,
              backgroundColor: this.colorSchemes.primary[0],
              borderColor: this.colorSchemes.primary[0],
              borderWidth: 1
            }]
          },
          options: this.getChartOptions('bar')
        });
      } else {
        // Create empty chart with "No data" message
        console.log('Creating empty age ranges chart - no data after filtering');
        this.charts['age-ranges'] = this.createChart('age-ranges-chart', {
          type: 'bar',
          data: {
            labels: ['No Data'],
            datasets: [{
              label: 'Number of Scenes',
              data: [0],
              backgroundColor: '#e5e7eb',
              borderColor: '#e5e7eb',
              borderWidth: 1
            }]
          },
          options: this.getChartOptions('bar')
        });
      }
    } else {
      console.warn('No age ranges data structure available');
    }

    console.log('Charts created:', Object.keys(this.charts));
  }

  createChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error(`Canvas with id ${canvasId} not found`);
      return null;
    }

    try {
      // Clear any existing chart on this canvas
      if (canvas.chart) {
        canvas.chart.destroy();
      }

      const ctx = canvas.getContext('2d');
      const chart = new Chart(ctx, config);

      // Store reference on canvas for cleanup
      canvas.chart = chart;

      console.log(`Chart created successfully for ${canvasId}`);
      return chart;
    } catch (error) {
      console.error(`Error creating chart for ${canvasId}:`, error);
      return null;
    }
  }

  getChartOptions(type) {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
            font: {
              size: 12
            }
          }
        }
      }
    };

    if (type === 'bar') {
      baseOptions.scales = {
        y: {
          beginAtZero: true,
          grid: {
            color: '#f3f4f6'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      };
    }

    if (type === 'line') {
      baseOptions.scales = {
        y: {
          beginAtZero: true,
          grid: {
            color: '#f3f4f6'
          }
        },
        x: {
          grid: {
            color: '#f3f4f6'
          }
        }
      };
      baseOptions.elements = {
        line: {
          tension: 0.4
        },
        point: {
          radius: 4,
          hoverRadius: 6
        }
      };
    }

    return baseOptions;
  }

  updateChartType(chartName, newType) {
    if (!this.charts[chartName] || !this.analyticsData) {
      console.warn(`Cannot update chart type: chart ${chartName} not found or no data`);
      return;
    }

    const chart = this.charts[chartName];
    const chartData = this.analyticsData.charts[chartName.replace('-', '_')];

    if (!chartData || !chartData.labels) {
      console.warn(`No data available for chart ${chartName}`);
      return;
    }

    // Destroy and recreate chart with new type
    try {
      chart.destroy();
    } catch (e) {
      console.warn('Error destroying chart:', e);
    }

    let config = {
      type: newType,
      data: {
        labels: chartData.labels,
        datasets: [{
          data: chartData.data,
          backgroundColor: newType === 'line' ? this.colorSchemes.primary[0] : this.colorSchemes.primary.slice(0, chartData.labels.length),
          borderColor: this.colorSchemes.primary[0],
          borderWidth: newType === 'doughnut' ? 2 : 1
        }]
      },
      options: this.getChartOptions(newType)
    };

    if (newType === 'bar' || newType === 'line') {
      config.data.datasets[0].label = 'Number of Scenes';
    }

    if (newType === 'doughnut') {
      config.data.datasets[0].borderColor = '#ffffff';
    }

    this.charts[chartName] = this.createChart(chartName + '-chart', config);
  }

  // Force refresh all charts with current data
  refreshCharts() {
    if (!this.analyticsData) {
      console.warn('No analytics data available for chart refresh');
      return;
    }

    console.log('Force refreshing all charts');
    this.createCharts(this.analyticsData);
  }

  showLoading() {
    this.toggleElement('loading-state', true);
    this.toggleElement('analytics-content', false);
    this.toggleElement('error-state', false);
  }

  hideLoading() {
    this.toggleElement('loading-state', false);
    this.toggleElement('analytics-content', true);
    this.toggleElement('error-state', false);
  }

  showError(message) {
    this.toggleElement('loading-state', false);
    this.toggleElement('analytics-content', false);
    this.toggleElement('error-state', true);

    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
      errorMessage.textContent = message;
    }
  }

  toggleElement(id, show) {
    const element = document.getElementById(id);
    if (element) {
      if (show) {
        element.classList.remove('hidden');
      } else {
        element.classList.add('hidden');
      }
    }
  }

  exportAnalytics() {
    if (!this.analyticsData) {
      this.showToast('No data to export. Please load analytics first.', 'error');
      return;
    }

    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";

    // Add summary statistics
    csvContent += "Analytics Summary\n";
    csvContent += "Total Scenes," + this.analyticsData.stats.total_scenes + "\n";
    csvContent += "Total Favorites," + this.analyticsData.stats.total_favorites + "\n";
    csvContent += "Average Effeminate Age," + this.analyticsData.stats.avg_effeminate_age + "\n";
    csvContent += "Average Masculine Age," + this.analyticsData.stats.avg_masculine_age + "\n\n";

    // Add country data
    csvContent += "Country Distribution\n";
    csvContent += "Country,Count\n";
    this.analyticsData.charts.countries.labels.forEach((label, index) => {
      csvContent += label + "," + this.analyticsData.charts.countries.data[index] + "\n";
    });

    csvContent += "\nSetting Distribution\n";
    csvContent += "Setting,Count\n";
    this.analyticsData.charts.settings.labels.forEach((label, index) => {
      csvContent += label + "," + this.analyticsData.charts.settings.data[index] + "\n";
    });

    csvContent += "\nEmotion Distribution\n";
    csvContent += "Emotion,Count\n";
    this.analyticsData.charts.emotions.labels.forEach((label, index) => {
      csvContent += label + "," + this.analyticsData.charts.emotions.data[index] + "\n";
    });

    // Create and download file
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "scenes_analytics_" + new Date().toISOString().split('T')[0] + ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success message
    this.showToast('Analytics report exported successfully!', 'success');
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

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function (m) { return map[m]; });
  }
}

// Initialize analytics dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  // Only initialize if we're on the analytics page
  if (document.querySelector('.analytics-dashboard')) {
    const dashboard = new AnalyticsDashboard();

    // Make dashboard available globally for debugging
    window.analyticsDashboard = dashboard;

    // Add debug methods
    window.debugAnalytics = {
      refreshCharts: () => dashboard.refreshCharts(),
      loadData: (params) => dashboard.loadAnalytics(params),
      showData: () => console.log('Current data:', dashboard.analyticsData),
      showCharts: () => console.log('Current charts:', dashboard.charts)
    };

    console.log('Analytics dashboard initialized. Use window.debugAnalytics for debugging.');
  }
});

// Add CSS for chart type buttons
const style = document.createElement('style');
style.textContent = `
  .chart-type-btn {
    padding: 8px;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 6px;
    color: #6b7280;
    transition: all 0.2s;
    cursor: pointer;
  }
  
  .chart-type-btn:hover {
    background: #f3f4f6;
    color: #374151;
  }
  
  .chart-type-btn.active {
    background: #6366f1;
    color: white;
    border-color: #6366f1;
  }
  
  .analytics-dashboard .animate-fadeIn {
    animation: fadeIn 0.5s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);
