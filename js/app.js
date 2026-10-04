/**
 * MetalPulse - Main Application Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // App State
  let currentCurrency = 'USD';
  let currentUnit = 'oz';
  let currentPeriod = '1M';

  // DOM Elements
  const metalCardsGrid = document.getElementById('metalCardsGrid');
  const verticalChartsStack = document.getElementById('verticalChartsStack');
  const timeframeSelector = document.getElementById('timeframeSelector');
  const lastUpdatedTimeEl = document.getElementById('lastUpdatedTime');
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  const apiStatusLabel = document.getElementById('apiStatusLabel');
  const refreshDataBtn = document.getElementById('refreshDataBtn');
  const refreshIcon = document.getElementById('refreshIcon');

  // Modal Elements
  const settingsModal = document.getElementById('settingsModal');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const saveApiBtn = document.getElementById('saveApiBtn');
  const clearApiBtn = document.getElementById('clearApiBtn');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const toastContainer = document.getElementById('toastContainer');

  /**
   * Show Toast Notification
   */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle-2';
    if (type === 'warning') iconName = 'alert-triangle';
    if (type === 'error') iconName = 'alert-octagon';

    toast.innerHTML = `
      <i data-lucide="${iconName}" style="width: 18px; height: 18px;"></i>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  /**
   * Update Status Badge based on API mode
   */
  function updateStatusBadge() {
    const isLive = window.metalDataService.isLive();
    if (isLive) {
      apiStatusBadge.classList.add('live-api');
      apiStatusLabel.textContent = 'MetalpriceAPI 라이브';
      apiStatusBadge.title = '실시간 MetalpriceAPI 데이터 수신 중';
    } else {
      apiStatusBadge.classList.remove('live-api');
      apiStatusLabel.textContent = '스마트 데모 모드';
      apiStatusBadge.title = '실제 시세 기반 실시간 시뮬레이션 가동 중';
    }
  }

  /**
   * Render Top Metal Price Cards (Horizontal Grid, 1 card per metal)
   */
  function renderMetalCards(latestData) {
    if (!metalCardsGrid) return;
    metalCardsGrid.innerHTML = '';

    METALS_CONFIG.forEach(metal => {
      const metalInfo = latestData[metal.symbol];
      if (!metalInfo) return;

      const convertedPrice = window.metalDataService.convertPrice(
        metalInfo.priceUSD, metal.symbol, currentCurrency, currentUnit
      );
      const convertedHigh = window.metalDataService.convertPrice(
        metalInfo.dayHighUSD, metal.symbol, currentCurrency, currentUnit
      );
      const convertedLow = window.metalDataService.convertPrice(
        metalInfo.dayLowUSD, metal.symbol, currentCurrency, currentUnit
      );
      const convertedDiff = window.metalDataService.convertPrice(
        Math.abs(metalInfo.changeUSD), metal.symbol, currentCurrency, currentUnit
      );

      const priceFormatted = window.metalDataService.formatPrice(convertedPrice, currentCurrency, currentUnit, metal.symbol);
      const highFormatted = window.metalDataService.formatPrice(convertedHigh, currentCurrency, currentUnit, metal.symbol);
      const lowFormatted = window.metalDataService.formatPrice(convertedLow, currentCurrency, currentUnit, metal.symbol);
      const diffFormatted = window.metalDataService.formatPrice(convertedDiff, currentCurrency, currentUnit, metal.symbol);

      const isPositive = metalInfo.changePercent >= 0;
      const changeClass = isPositive ? 'gain' : 'loss';
      const arrowIcon = isPositive ? 'trending-up' : 'trending-down';
      const sign = isPositive ? '+' : '-';

      // Day range percentage
      const totalRange = convertedHigh - convertedLow;
      const progressPercent = totalRange > 0 
        ? Math.min(100, Math.max(0, ((convertedPrice - convertedLow) / totalRange) * 100))
        : 50;

      const card = document.createElement('div');
      card.className = `metal-card ${metal.accentClass}`;
      card.setAttribute('data-symbol', metal.symbol);
      card.innerHTML = `
        <div class="card-top">
          <div class="metal-identity">
            <div class="metal-badge">${metal.badgeText}</div>
            <div class="metal-names">
              <span class="metal-korean-name">${metal.nameKo}</span>
              <span class="metal-eng-name">${metal.nameEn} (${metal.symbol})</span>
            </div>
          </div>
          <div class="price-change-pill ${changeClass}">
            <i data-lucide="${arrowIcon}" class="change-arrow"></i>
            <span>${sign}${Math.abs(metalInfo.changePercent).toFixed(2)}%</span>
          </div>
        </div>

        <div class="card-price-display">
          <div class="card-current-price">
            ${priceFormatted.formatted}<span class="price-unit-label">${priceFormatted.unitSuffix}</span>
          </div>
          <div class="card-diff-text">
            전일비: <span style="color: ${isPositive ? 'var(--green-gain)' : 'var(--red-loss)'}; font-weight: 600;">
              ${sign}${diffFormatted.formatted}
            </span>
          </div>
        </div>

        <div class="card-range-bar-wrap">
          <div class="range-labels">
            <span>저가 <strong>${lowFormatted.formatted}</strong></span>
            <span>고가 <strong>${highFormatted.formatted}</strong></span>
          </div>
          <div class="range-progress-bg">
            <div class="range-progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
        </div>
      `;

      // Click card to scroll to corresponding vertical chart
      card.addEventListener('click', () => {
        const targetPanel = document.getElementById(`chart-panel-${metal.symbol}`);
        if (targetPanel) {
          targetPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetPanel.style.transform = 'scale(1.015)';
          targetPanel.style.borderColor = 'var(--gold-primary)';
          setTimeout(() => {
            targetPanel.style.transform = '';
            targetPanel.style.borderColor = '';
          }, 1200);
        }
      });

      metalCardsGrid.appendChild(card);
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * Refresh all real-time and historical data
   */
  async function refreshAllData(showNotification = false) {
    if (refreshIcon) refreshDataBtn.classList.add('refreshing');

    try {
      // 1. Fetch Latest Prices
      const latestResult = await window.metalDataService.fetchLatestPrices();
      renderMetalCards(latestResult.data);

      // 2. Render Vertical Charts for selected period
      await window.metalChartManager.renderHistoricalCharts(currentPeriod, currentCurrency, currentUnit);

      // Update timestamp
      const now = new Date();
      lastUpdatedTimeEl.textContent = now.toLocaleTimeString('ko-KR', { hour12: false });
      updateStatusBadge();

      if (showNotification) {
        showToast('금속 시세가 최신 정보로 갱신되었습니다.', 'success');
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
      showToast('데이터 갱신 중 오류가 발생했습니다.', 'error');
    } finally {
      if (refreshIcon) {
        setTimeout(() => refreshDataBtn.classList.remove('refreshing'), 400);
      }
    }
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // 1. Currency Selector Buttons (USD / KRW)
    document.querySelectorAll('.currency-selector .pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetCurrency = e.target.getAttribute('data-currency');
        if (targetCurrency === currentCurrency) return;

        document.querySelectorAll('.currency-selector .pill-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        currentCurrency = targetCurrency;
        renderMetalCards(window.metalDataService.latestPrices);
        window.metalChartManager.updateDisplayPreferences(currentCurrency, currentUnit);
        showToast(`표시 통화가 ${currentCurrency}로 변경되었습니다.`, 'info');
      });
    });

    // 2. Unit Selector Buttons (oz / g)
    document.querySelectorAll('.unit-selector .pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetUnit = e.target.getAttribute('data-unit');
        if (targetUnit === currentUnit) return;

        document.querySelectorAll('.unit-selector .pill-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        currentUnit = targetUnit;
        renderMetalCards(window.metalDataService.latestPrices);
        window.metalChartManager.updateDisplayPreferences(currentCurrency, currentUnit);
        showToast(`표시 단위가 ${currentUnit === 'oz' ? '온스(oz)' : '그램(g)'}으로 변경되었습니다.`, 'info');
      });
    });

    // 3. Timeframe Filter Selector (7D, 1M, 3M, 6M, 1Y)
    if (timeframeSelector) {
      timeframeSelector.querySelectorAll('.time-pill').forEach(pill => {
        pill.addEventListener('click', async (e) => {
          const selectedPeriod = e.target.getAttribute('data-period');
          if (selectedPeriod === currentPeriod) return;

          timeframeSelector.querySelectorAll('.time-pill').forEach(p => p.classList.remove('active'));
          e.target.classList.add('active');

          currentPeriod = selectedPeriod;
          await window.metalChartManager.renderHistoricalCharts(currentPeriod, currentCurrency, currentUnit);
          showToast(`조회 기간이 ${selectedPeriod}로 변경되었습니다.`, 'info');
        });
      });
    }

    // 4. Refresh Button
    if (refreshDataBtn) {
      refreshDataBtn.addEventListener('click', () => {
        refreshAllData(true);
      });
    }

    // 5. Settings Modal Open/Close
    if (openSettingsBtn) {
      openSettingsBtn.addEventListener('click', () => {
        apiKeyInput.value = window.metalDataService.getApiKey();
        const mode = window.metalDataService.getDataMode();
        const radio = document.querySelector(`input[name="dataSourceMode"][value="${mode}"]`);
        if (radio) radio.checked = true;
        settingsModal.classList.add('open');
      });
    }

    if (closeSettingsBtn) {
      closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('open');
      });
    }

    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.remove('open');
      }
    });

    // 6. Save Settings
    if (saveApiBtn) {
      saveApiBtn.addEventListener('click', async () => {
        const inputKey = apiKeyInput.value.trim();
        const selectedRadio = document.querySelector('input[name="dataSourceMode"]:checked');
        const selectedMode = selectedRadio ? selectedRadio.value : 'demo';

        if (selectedMode === 'live' && !inputKey) {
          showToast('MetalpriceAPI 직접 연동 모드를 사용하려면 API Key를 입력해야 합니다.', 'warning');
          return;
        }

        window.metalDataService.setApiKey(inputKey);
        window.metalDataService.setDataMode(selectedMode);
        settingsModal.classList.remove('open');

        showToast('설정이 저장되었습니다. 데이터를 재동기화합니다.', 'success');
        await refreshAllData(false);
      });
    }

    // 7. Clear API Key
    if (clearApiBtn) {
      clearApiBtn.addEventListener('click', async () => {
        window.metalDataService.setApiKey('');
        window.metalDataService.setDataMode('demo');
        apiKeyInput.value = '';
        const demoRadio = document.querySelector('input[name="dataSourceMode"][value="demo"]');
        if (demoRadio) demoRadio.checked = true;
        settingsModal.classList.remove('open');
        showToast('API 키가 삭제되었으며 데모 모드로 전환되었습니다.', 'info');
        await refreshAllData(false);
      });
    }
  }

  /**
   * Initialize Application
   */
  async function init() {
    // 1. Initialize Vertical Chart Containers in DOM
    window.metalChartManager.initContainers(verticalChartsStack);

    // 2. Setup Events
    setupEventListeners();

    // 3. Initial Data Fetch & Render
    await refreshAllData(false);

    // 4. Auto-refresh price every 90 seconds
    setInterval(() => {
      refreshAllData(false);
    }, 90000);
  }

  init();
});
