/**
 * MetalPulse - Vertical Metal Charts Manager (Chart.js Integration)
 */

class MetalChartManager {
  constructor() {
    this.charts = {}; // Store Chart.js instances keyed by symbol (XAU, XAG, etc.)
    this.currentPeriod = '1M';
    this.currentCurrency = 'USD';
    this.currentUnit = 'oz';
    this.cachedHistoricalData = null;
  }

  /**
   * Initialize DOM containers for each metal in vertical order
   */
  initContainers(containerElement) {
    if (!containerElement) return;
    containerElement.innerHTML = '';

    METALS_CONFIG.forEach(metal => {
      const panel = document.createElement('div');
      panel.className = `metal-chart-panel ${metal.panelClass}`;
      panel.id = `chart-panel-${metal.symbol}`;

      panel.innerHTML = `
        <div class="chart-panel-header">
          <div class="chart-title-area">
            <div class="chart-emblem">${metal.badgeText}</div>
            <div class="chart-name-group">
              <h3>${metal.nameKo} (${metal.nameEn}) <span style="font-size: 0.85em; opacity: 0.6; font-weight: normal;">${metal.symbol}</span></h3>
              <p id="period-label-${metal.symbol}">최근 1개월 가격 변동 추이</p>
            </div>
          </div>

          <div class="chart-stats-summary" id="stats-${metal.symbol}">
            <div class="stat-item">
              <span class="stat-label">기간 최고가</span>
              <span class="stat-value" id="stat-high-${metal.symbol}">--</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-label">기간 최저가</span>
              <span class="stat-value" id="stat-low-${metal.symbol}">--</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-label">기간 평균가</span>
              <span class="stat-value" id="stat-avg-${metal.symbol}">--</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-label">기간 변동률</span>
              <span class="stat-value" id="stat-change-${metal.symbol}">--</span>
            </div>
          </div>
        </div>

        <div class="chart-canvas-container">
          <canvas id="canvas-${metal.symbol}"></canvas>
        </div>
      `;

      containerElement.appendChild(panel);
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * Load and render historical charts for the selected period
   */
  async renderHistoricalCharts(period = this.currentPeriod, currency = this.currentCurrency, unit = this.currentUnit) {
    this.currentPeriod = period;
    this.currentCurrency = currency;
    this.currentUnit = unit;

    const historicalResult = await window.metalDataService.fetchHistoricalData(period);
    this.cachedHistoricalData = historicalResult.data;

    METALS_CONFIG.forEach(metal => {
      const rawSeries = this.cachedHistoricalData[metal.symbol] || [];
      this.renderSingleMetalChart(metal, rawSeries);
    });
  }

  /**
   * Render or update a single metal's chart and statistics
   */
  renderSingleMetalChart(metal, rawSeries) {
    const canvas = document.getElementById(`canvas-${metal.symbol}`);
    if (!canvas) return;

    // Convert prices based on currency and unit
    const labels = rawSeries.map(item => {
      const dateParts = item.date.split('-');
      return `${dateParts[1]}/${dateParts[2]}`; // MM/DD
    });

    const convertedData = rawSeries.map(item => {
      return window.metalDataService.convertPrice(item.priceUSD, metal.symbol, this.currentCurrency, this.currentUnit);
    });

    // Calculate High, Low, Average, Change for the period
    if (convertedData.length > 0) {
      const high = Math.max(...convertedData);
      const low = Math.min(...convertedData);
      const avg = convertedData.reduce((acc, cur) => acc + cur, 0) / convertedData.length;
      const firstPrice = convertedData[0];
      const lastPrice = convertedData[convertedData.length - 1];
      const changeRate = ((lastPrice - firstPrice) / firstPrice) * 100;

      // Update stat elements
      const highFormatted = window.metalDataService.formatPrice(high, this.currentCurrency, this.currentUnit, metal.symbol);
      const lowFormatted = window.metalDataService.formatPrice(low, this.currentCurrency, this.currentUnit, metal.symbol);
      const avgFormatted = window.metalDataService.formatPrice(avg, this.currentCurrency, this.currentUnit, metal.symbol);

      const highEl = document.getElementById(`stat-high-${metal.symbol}`);
      const lowEl = document.getElementById(`stat-low-${metal.symbol}`);
      const avgEl = document.getElementById(`stat-avg-${metal.symbol}`);
      const changeEl = document.getElementById(`stat-change-${metal.symbol}`);
      const periodLabelEl = document.getElementById(`period-label-${metal.symbol}`);

      if (highEl) highEl.textContent = `${highFormatted.formatted}`;
      if (lowEl) lowEl.textContent = `${lowFormatted.formatted}`;
      if (avgEl) avgEl.textContent = `${avgFormatted.formatted}`;

      if (changeEl) {
        const sign = changeRate >= 0 ? '+' : '';
        const color = changeRate >= 0 ? 'var(--green-gain)' : 'var(--red-loss)';
        changeEl.innerHTML = `<span style="color: ${color}">${sign}${changeRate.toFixed(2)}%</span>`;
      }

      const periodNames = {
        '7D': '최근 1주일',
        '1M': '최근 1개월',
        '3M': '최근 3개월',
        '6M': '최근 6개월',
        '1Y': '최근 1년'
      };
      if (periodLabelEl) {
        periodLabelEl.textContent = `${periodNames[this.currentPeriod] || this.currentPeriod} 시세 변동 추이 (${this.currentCurrency}, ${this.currentUnit})`;
      }
    }

    // Destroy previous Chart instance if exists
    if (this.charts[metal.symbol]) {
      this.charts[metal.symbol].destroy();
    }

    const ctx = canvas.getContext('2d');

    // Create Luxury Vertical Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, metal.gradientColors[0]);
    gradient.addColorStop(0.7, metal.gradientColors[1]);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    const config = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `${metal.nameKo} 시세`,
          data: convertedData,
          borderColor: metal.colorHex,
          borderWidth: 2.5,
          backgroundColor: gradient,
          fill: true,
          tension: 0.35, // Smooth spline
          pointRadius: convertedData.length > 60 ? 0 : 2.5,
          pointHoverRadius: 6,
          pointBackgroundColor: metal.colorHex,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(15, 17, 24, 0.95)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            displayColors: false,
            callbacks: {
              title: (tooltipItems) => {
                const index = tooltipItems[0].dataIndex;
                const fullDate = rawSeries[index]?.date || tooltipItems[0].label;
                return `📅 ${fullDate}`;
              },
              label: (context) => {
                const val = context.parsed.y;
                const formatted = window.metalDataService.formatPrice(val, this.currentCurrency, this.currentUnit, metal.symbol);
                return `${metal.nameKo} (${metal.symbol}): ${formatted.formatted} ${formatted.unitSuffix}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.04)',
              drawBorder: false,
            },
            ticks: {
              color: '#64748b',
              font: {
                family: "'Outfit', sans-serif",
                size: 11
              },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false,
            },
            ticks: {
              color: '#94a3b8',
              font: {
                family: "'Outfit', sans-serif",
                size: 11
              },
              callback: (value) => {
                if (this.currentCurrency === 'KRW') {
                  return value >= 1000000 
                    ? `${(value / 10000).toFixed(0)}만` 
                    : value.toLocaleString();
                }
                return `$${value.toLocaleString()}`;
              }
            }
          }
        }
      }
    };

    this.charts[metal.symbol] = new Chart(ctx, config);
  }

  /**
   * Fast refresh all charts on currency or unit toggle
   */
  updateDisplayPreferences(currency, unit) {
    this.currentCurrency = currency;
    this.currentUnit = unit;
    if (this.cachedHistoricalData) {
      METALS_CONFIG.forEach(metal => {
        const rawSeries = this.cachedHistoricalData[metal.symbol] || [];
        this.renderSingleMetalChart(metal, rawSeries);
      });
    } else {
      this.renderHistoricalCharts(this.currentPeriod, currency, unit);
    }
  }
}

// Global instance
window.metalChartManager = new MetalChartManager();
