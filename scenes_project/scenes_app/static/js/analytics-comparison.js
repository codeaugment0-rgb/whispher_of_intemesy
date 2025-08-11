// Analytics Comparison Feature
class AnalyticsComparison {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.comparisonData = [];
    this.maxComparisons = 3;
    
    this.init();
  }

  init() {
    this.createComparisonUI();
    this.setupComparisonListeners();
  }

  createComparisonUI() {
    console.log('Creating comparison UI...');
    const comparisonContainer = document.createElement('div');
    comparisonContainer.className = 'analytics-comparison bg-white rounded-xl p-6 mb-8';
    comparisonContainer.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Data Comparison</h3>
        <div class="flex items-center space-x-2">
          <button id="save-snapshot" class="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
            Save Current View
          </button>
          <button id="clear-comparisons" class="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Clear All
          </button>
        </div>
      </div>
      
      <div id="comparison-snapshots" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <!-- Comparison snapshots will be added here -->
      </div>
      
      <div id="comparison-charts" class="hidden">
        <h4 class="text-md font-medium text-gray-800 mb-4">Comparison Charts</h4>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-gray-50 rounded-lg p-4">
            <h5 class="text-sm font-medium text-gray-700 mb-3">Scene Count Comparison</h5>
            <canvas id="comparison-scenes-chart"></canvas>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <h5 class="text-sm font-medium text-gray-700 mb-3">Favorites Comparison</h5>
            <canvas id="comparison-favorites-chart"></canvas>
          </div>
        </div>
      </div>
    `;

    // Insert comparison into the designated container
    const comparisonContainer_target = document.getElementById('comparison-container');
    if (comparisonContainer_target) {
      comparisonContainer_target.appendChild(comparisonContainer);
      console.log('Comparison UI inserted into comparison-container');
    } else {
      // Fallback: insert after filters section
      const filtersSection = document.querySelector('.analytics-filters');
      if (filtersSection) {
        filtersSection.insertAdjacentElement('afterend', comparisonContainer);
        console.log('Comparison UI inserted as fallback');
      } else {
        console.error('Could not find container for comparison');
      }
    }
  }

  setupComparisonListeners() {
    document.getElementById('save-snapshot')?.addEventListener('click', () => {
      this.saveCurrentSnapshot();
    });

    document.getElementById('clear-comparisons')?.addEventListener('click', () => {
      this.clearAllComparisons();
    });
  }

  saveCurrentSnapshot() {
    if (this.comparisonData.length >= this.maxComparisons) {
      this.dashboard.showToast('Maximum 3 comparisons allowed. Remove one first.', 'error');
      return;
    }

    if (!this.dashboard.analyticsData) {
      this.dashboard.showToast('No data to save. Load analytics first.', 'error');
      return;
    }

    const snapshot = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      data: JSON.parse(JSON.stringify(this.dashboard.analyticsData)),
      filters: this.dashboard.filters ? JSON.parse(JSON.stringify(this.dashboard.filters.filters)) : {},
      label: this.generateSnapshotLabel()
    };

    this.comparisonData.push(snapshot);
    this.renderSnapshots();
    this.updateComparisonCharts();
    
    this.dashboard.showToast('Snapshot saved successfully!', 'success');
  }

  generateSnapshotLabel() {
    const activeFilters = this.dashboard.filters ? this.dashboard.filters.getActiveFilters() : [];
    if (activeFilters.length === 0) {
      return 'All Data';
    }
    
    const filterLabels = activeFilters.map(filter => {
      const value = this.dashboard.filters.filters[filter];
      return `${filter}: ${value}`;
    });
    
    return filterLabels.join(', ');
  }

  renderSnapshots() {
    const container = document.getElementById('comparison-snapshots');
    if (!container) return;

    container.innerHTML = this.comparisonData.map(snapshot => `
      <div class="comparison-snapshot bg-gray-50 rounded-lg p-4 border-2 border-transparent hover:border-primary transition-colors">
        <div class="flex items-center justify-between mb-2">
          <h5 class="text-sm font-medium text-gray-800 truncate">${snapshot.label}</h5>
          <button class="remove-snapshot text-red-500 hover:text-red-700" data-id="${snapshot.id}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="text-xs text-gray-600 mb-3">${snapshot.timestamp}</div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="text-gray-600">Scenes:</span>
            <span class="font-medium">${snapshot.data.stats.total_scenes}</span>
          </div>
          <div>
            <span class="text-gray-600">Favorites:</span>
            <span class="font-medium">${snapshot.data.stats.total_favorites}</span>
          </div>
          <div>
            <span class="text-gray-600">Avg Eff Age:</span>
            <span class="font-medium">${snapshot.data.stats.avg_effeminate_age}</span>
          </div>
          <div>
            <span class="text-gray-600">Avg Masc Age:</span>
            <span class="font-medium">${snapshot.data.stats.avg_masculine_age}</span>
          </div>
        </div>
      </div>
    `).join('');

    // Add event listeners for remove buttons
    container.querySelectorAll('.remove-snapshot').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.closest('.remove-snapshot').dataset.id);
        this.removeSnapshot(id);
      });
    });

    // Show/hide comparison charts
    const chartsContainer = document.getElementById('comparison-charts');
    if (chartsContainer) {
      if (this.comparisonData.length > 1) {
        chartsContainer.classList.remove('hidden');
      } else {
        chartsContainer.classList.add('hidden');
      }
    }
  }

  removeSnapshot(id) {
    this.comparisonData = this.comparisonData.filter(snapshot => snapshot.id !== id);
    this.renderSnapshots();
    this.updateComparisonCharts();
    this.dashboard.showToast('Snapshot removed', 'info');
  }

  clearAllComparisons() {
    this.comparisonData = [];
    this.renderSnapshots();
    this.updateComparisonCharts();
    this.dashboard.showToast('All comparisons cleared', 'info');
  }

  createComparisonChart(canvasId, dataKey, label) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Destroy existing chart
    if (canvas.chart) {
      canvas.chart.destroy();
      canvas.chart = null;
    }

    const ctx = canvas.getContext('2d');
    const labels = this.comparisonData.map(snapshot => snapshot.label);
    const data = this.comparisonData.map(snapshot => snapshot.data.stats[dataKey]);

    canvas.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: label,
          data: data,
          backgroundColor: this.dashboard.colorSchemes.primary[0],
          borderColor: this.dashboard.colorSchemes.primary[0],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 0,
        devicePixelRatio: 1,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: '#f3f4f6'
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 45,
              minRotation: 0
            }
          }
        }
      }
    });
  }

  updateComparisonCharts() {
    if (this.comparisonData.length < 2) return;

    const chartsContainer = document.getElementById('comparison-charts');
    if (chartsContainer) {
      chartsContainer.querySelectorAll('canvas').forEach(canvas => {
        if (canvas.chart) {
          canvas.chart.destroy();
          canvas.chart = null;
        }
      });
    }
  
    this.createComparisonChart('comparison-scenes-chart', 'total_scenes', 'Scene Count');
    this.createComparisonChart('comparison-favorites-chart', 'total_favorites', 'Favorites Count');
  }
}

// Advanced Analytics Insights
class AnalyticsInsights {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.insights = [];
    
    this.init();
  }

  init() {
    this.createInsightsUI();
  }

  createInsightsUI() {
    console.log('Creating insights UI...');
    const insightsContainer = document.createElement('div');
    insightsContainer.className = 'analytics-insights bg-white rounded-xl p-6 mb-8';
    insightsContainer.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">AI-Powered Insights</h3>
        <button id="generate-insights" class="text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors">
          Generate Insights
        </button>
      </div>
      
      <div id="insights-content" class="space-y-4">
        <div class="text-center py-8 text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
          </svg>
          <p>Click "Generate Insights" to get AI-powered analysis of your data</p>
        </div>
      </div>
    `;

    // Insert insights into the designated container
    const insightsContainer_target = document.getElementById('insights-container');
    if (insightsContainer_target) {
      insightsContainer_target.appendChild(insightsContainer);
      console.log('Insights UI inserted into insights-container');
    } else {
      // Fallback: insert after comparison section
      const comparisonSection = document.querySelector('.analytics-comparison');
      if (comparisonSection) {
        comparisonSection.insertAdjacentElement('afterend', insightsContainer);
        console.log('Insights UI inserted as fallback');
      } else {
        console.error('Could not find container for insights');
      }
    }

    // Setup event listener
    document.getElementById('generate-insights')?.addEventListener('click', () => {
      this.generateInsights();
    });
  }

  generateInsights() {
    if (!this.dashboard.analyticsData) {
      this.dashboard.showToast('No data available for insights', 'error');
      return;
    }

    const insights = this.analyzeData(this.dashboard.analyticsData);
    this.renderInsights(insights);
  }

  analyzeData(data) {
    const insights = [];

    // Analyze country distribution
    if (data.charts.countries.labels.length > 0) {
      const topCountry = data.charts.countries.labels[0];
      const topCountryCount = data.charts.countries.data[0];
      const totalScenes = data.stats.total_scenes;
      const percentage = ((topCountryCount / totalScenes) * 100).toFixed(1);
      
      insights.push({
        type: 'trend',
        title: 'Geographic Concentration',
        description: `${topCountry} dominates your collection with ${percentage}% of all scenes (${topCountryCount} out of ${totalScenes}).`,
        recommendation: percentage > 50 ? 'Consider diversifying with scenes from other countries.' : 'Good geographic diversity in your collection.'
      });
    }

    // Analyze age patterns
    const avgEffAge = data.stats.avg_effeminate_age;
    const avgMascAge = data.stats.avg_masculine_age;
    const ageDiff = Math.abs(avgEffAge - avgMascAge);
    
    insights.push({
      type: 'pattern',
      title: 'Age Dynamics',
      description: `Average age difference is ${ageDiff.toFixed(1)} years (Effeminate: ${avgEffAge}, Masculine: ${avgMascAge}).`,
      recommendation: ageDiff > 10 ? 'Large age gaps are common in your scenes.' : 'Relatively balanced age representation.'
    });

    // Analyze favorites rate
    const favoriteRate = data.stats.favorite_rate;
    insights.push({
      type: 'engagement',
      title: 'User Engagement',
      description: `${favoriteRate}% of scenes are favorited by users.`,
      recommendation: favoriteRate > 20 ? 'High engagement rate!' : favoriteRate > 10 ? 'Moderate engagement.' : 'Consider improving scene quality to increase favorites.'
    });

    // Analyze emotion distribution
    if (data.charts.emotions.labels.length > 0) {
      const topEmotion = data.charts.emotions.labels[0];
      const emotionCount = data.charts.emotions.data[0];
      const emotionPercentage = ((emotionCount / data.stats.total_scenes) * 100).toFixed(1);
      
      insights.push({
        type: 'content',
        title: 'Emotional Tone',
        description: `${topEmotion} is the dominant emotion (${emotionPercentage}% of scenes).`,
        recommendation: emotionPercentage > 40 ? 'Consider adding more emotional variety.' : 'Good emotional balance in your collection.'
      });
    }

    return insights;
  }

  renderInsights(insights) {
    const container = document.getElementById('insights-content');
    if (!container) return;

    container.innerHTML = insights.map(insight => `
      <div class="insight-item bg-gradient-to-r from-${this.getInsightColor(insight.type)}-50 to-${this.getInsightColor(insight.type)}-100 rounded-lg p-4 border-l-4 border-${this.getInsightColor(insight.type)}-500">
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0">
            ${this.getInsightIcon(insight.type)}
          </div>
          <div class="flex-1">
            <h4 class="text-sm font-semibold text-gray-900 mb-1">${insight.title}</h4>
            <p class="text-sm text-gray-700 mb-2">${insight.description}</p>
            <p class="text-xs text-gray-600 italic">${insight.recommendation}</p>
          </div>
        </div>
      </div>
    `).join('');

    this.dashboard.showToast('Insights generated successfully!', 'success');
  }

  getInsightColor(type) {
    const colors = {
      trend: 'blue',
      pattern: 'green',
      engagement: 'purple',
      content: 'orange'
    };
    return colors[type] || 'gray';
  }

  getInsightIcon(type) {
    const icons = {
      trend: '<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>',
      pattern: '<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>',
      engagement: '<svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>',
      content: '<svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M7 4h10"></path></svg>'
    };
    return icons[type] || '';
  }
}

// Export classes
window.AnalyticsComparison = AnalyticsComparison;
window.AnalyticsInsights = AnalyticsInsights;