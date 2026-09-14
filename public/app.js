// Image SEO Pro Client Application
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const fileQueue = document.getElementById('fileQueue');
  const queueList = document.getElementById('queueList');
  const queueCount = document.getElementById('queueCount');
  const clearQueueBtn = document.getElementById('clearQueueBtn');
  const startAnalyzeBtn = document.getElementById('startAnalyzeBtn');
  const targetNicheInput = document.getElementById('targetNicheInput');
  const namingStyleSelect = document.getElementById('namingStyleSelect');

  const progressWrapper = document.getElementById('progressWrapper');
  const progressStatus = document.getElementById('progressStatus');
  const progressFill = document.getElementById('progressFill');
  const progressPercentage = document.getElementById('progressPercentage');

  const resultsSection = document.getElementById('resultsSection');
  const resultsGrid = document.getElementById('resultsGrid');
  const resultsCountBadge = document.getElementById('resultsCountBadge');
  const downloadAllZipBtn = document.getElementById('downloadAllZipBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const copyAllAltBtn = document.getElementById('copyAllAltBtn');

  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
  const defaultLanguageSelect = document.getElementById('defaultLanguageSelect');
  const defaultNamingConvention = document.getElementById('defaultNamingConvention');
  const aiStatusBadge = document.getElementById('aiStatusBadge');
  const aiStatusText = document.getElementById('aiStatusText');
  const toastContainer = document.getElementById('toastContainer');

  const apiKeyBanner = document.getElementById('apiKeyBanner');
  const quickApiKeyInput = document.getElementById('quickApiKeyInput');
  const saveQuickKeyBtn = document.getElementById('saveQuickKeyBtn');

  const photoCategorySelect = document.getElementById('photoCategorySelect');
  const studioLocationInput = document.getElementById('studioLocationInput');
  const studioBrandNameInput = document.getElementById('studioBrandNameInput');
  const settingsStudioNameInput = document.getElementById('settingsStudioNameInput');
  const compressionModeSelect = document.getElementById('compressionModeSelect');

  // User Token & Payment State
  let userToken = localStorage.getItem('payal_user_token');
  if (!userToken) {
    userToken = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    localStorage.setItem('payal_user_token', userToken);
  }
  let activePlanId = null;
  let selectedScreenshotFile = null;
  let currentUserData = null;

  // Studio Account & Identity Elements
  const settingsUserTokenText = document.getElementById('settingsUserTokenText');
  const settingsAccountPlanBadge = document.getElementById('settingsAccountPlanBadge');
  const copyUserTokenBtn = document.getElementById('copyUserTokenBtn');
  const restoreAccountInput = document.getElementById('restoreAccountInput');
  const restoreAccountBtn = document.getElementById('restoreAccountBtn');
  const pricingRestoreLink = document.getElementById('pricingRestoreLink');

  // Payment DOM Elements
  const userCreditsBadge = document.getElementById('userCreditsBadge');
  const creditCountText = document.getElementById('creditCountText');
  const openPricingBtn = document.getElementById('openPricingBtn');
  const pricingModal = document.getElementById('pricingModal');
  const closePricingBtn = document.getElementById('closePricingBtn');
  const pricingPlansGrid = document.getElementById('pricingPlansGrid');
  const upiPaymentSection = document.getElementById('upiPaymentSection');
  const backToPlansBtn = document.getElementById('backToPlansBtn');
  const selectedPlanPill = document.getElementById('selectedPlanPill');
  const paymentQrImg = document.getElementById('paymentQrImg');
  const displayUpiId = document.getElementById('displayUpiId');
  const copyUpiIdBtn = document.getElementById('copyUpiIdBtn');
  const screenshotDropzone = document.getElementById('screenshotDropzone');
  const paymentScreenshotInput = document.getElementById('paymentScreenshotInput');
  const screenshotPrompt = document.getElementById('screenshotPrompt');
  const screenshotPreviewWrap = document.getElementById('screenshotPreviewWrap');
  const screenshotImgPreview = document.getElementById('screenshotImgPreview');
  const screenshotFileName = document.getElementById('screenshotFileName');
  const aiVerifyStatus = document.getElementById('aiVerifyStatus');
  const verifyStatusText = document.getElementById('verifyStatusText');
  const verifyPaymentBtn = document.getElementById('verifyPaymentBtn');

  // WhatsApp & Admin Flow Elements
  const sendWhatsAppProofBtn = document.getElementById('sendWhatsAppProofBtn');
  const customerNameInput = document.getElementById('customerNameInput');
  const customerPhoneInput = document.getElementById('customerPhoneInput');
  const customerUtrInput = document.getElementById('customerUtrInput');
  const approvalWaitCard = document.getElementById('approvalWaitCard');

  const openAdminBtn = document.getElementById('openAdminBtn');
  const adminModal = document.getElementById('adminModal');
  const closeAdminBtn = document.getElementById('closeAdminBtn');
  const adminAuthBox = document.getElementById('adminAuthBox');
  const adminContentBox = document.getElementById('adminContentBox');
  const adminSecretInput = document.getElementById('adminSecretInput');
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  const pendingRequestsCountBadge = document.getElementById('pendingRequestsCountBadge');
  const refreshAdminBtn = document.getElementById('refreshAdminBtn');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');
  const adminRequestsTableBody = document.getElementById('adminRequestsTableBody');
  const manualUserTokenInput = document.getElementById('manualUserTokenInput');
  const manualPlanSelect = document.getElementById('manualPlanSelect');
  const manualUpgradeBtn = document.getElementById('manualUpgradeBtn');

  const customWhatsappInput = document.getElementById('customWhatsappInput');
  const customUpiIdInput = document.getElementById('customUpiIdInput');

  // State
  let selectedFiles = [];
  let processedResults = [];
  let serverHasKey = false;

  // --------------------------------------------------
  // INITIALIZATION & SETTINGS
  // --------------------------------------------------
  function loadSettings() {
    const savedKey = localStorage.getItem('gemini_api_key') || '';
    const savedLang = localStorage.getItem('seo_language') || 'English';
    const savedNaming = localStorage.getItem('seo_naming_style') || 'kebab-case';
    const savedLocation = localStorage.getItem('payal_films_location') || '';
    const savedCategory = localStorage.getItem('payal_films_category') || 'Auto-Detect Indian Wedding Photography';
    const savedBrand = localStorage.getItem('studio_brand_name') || '';
    const savedCompression = localStorage.getItem('seo_compression_mode') || 'webp';

    geminiApiKeyInput.value = savedKey;
    if (quickApiKeyInput) quickApiKeyInput.value = savedKey;
    defaultLanguageSelect.value = savedLang;
    defaultNamingConvention.value = savedNaming;
    namingStyleSelect.value = savedNaming;
    if (studioLocationInput) studioLocationInput.value = savedLocation;
    if (photoCategorySelect) photoCategorySelect.value = savedCategory;
    if (studioBrandNameInput) studioBrandNameInput.value = savedBrand;
    if (settingsStudioNameInput) settingsStudioNameInput.value = savedBrand;
    if (compressionModeSelect) compressionModeSelect.value = savedCompression;

    checkServerConfig(savedKey);
  }

  if (compressionModeSelect) {
    compressionModeSelect.addEventListener('change', () => {
      localStorage.setItem('seo_compression_mode', compressionModeSelect.value);
    });
  }

  // Real-time Brand Name sync
  if (studioBrandNameInput) {
    studioBrandNameInput.addEventListener('input', () => {
      const val = studioBrandNameInput.value;
      localStorage.setItem('studio_brand_name', val.trim());
      if (settingsStudioNameInput) settingsStudioNameInput.value = val;
    });
  }
  if (settingsStudioNameInput) {
    settingsStudioNameInput.addEventListener('input', () => {
      const val = settingsStudioNameInput.value;
      localStorage.setItem('studio_brand_name', val.trim());
      if (studioBrandNameInput) studioBrandNameInput.value = val;
    });
  }

  async function checkServerConfig(clientKey) {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      serverHasKey = data.hasServerKey;

      if (clientKey || serverHasKey) {
        aiStatusText.textContent = 'AI Vision Active (Gemini)';
        aiStatusBadge.querySelector('.pulse-dot').style.background = '#10b981';
        if (apiKeyBanner) {
          apiKeyBanner.style.background = 'rgba(16, 185, 129, 0.1)';
          apiKeyBanner.style.borderColor = 'rgba(16, 185, 129, 0.3)';
          apiKeyBanner.querySelector('.api-banner-left strong').textContent = '✅ Free Gemini AI Vision Active & Ready!';
          apiKeyBanner.querySelector('.api-banner-left p').textContent = 'Images will be analyzed visually using Google Gemini AI for peak ranking.';
        }
      } else {
        aiStatusText.textContent = 'Smart Heuristic Mode';
        aiStatusBadge.querySelector('.pulse-dot').style.background = '#f59e0b';
      }

      if (data.upiId && customUpiIdInput) {
        customUpiIdInput.value = data.upiId;
      }
      if (data.whatsappNumber && customWhatsappInput) {
        customWhatsappInput.value = data.whatsappNumber;
      }
    } catch (e) {
      aiStatusText.textContent = 'Server Connected';
    }
  }

  async function saveKeyToServerAndLocal(key) {
    if (!key) {
      showToast('Please paste a valid API key', 'error');
      return;
    }

    showToast('Verifying API key with Google AI...', 'success');

    try {
      // Test key first
      const testRes = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });

      if (!testRes.ok) {
        const err = await testRes.json().catch(() => ({}));
        throw new Error(err.error || 'Invalid API key. Please check from Google AI Studio.');
      }

      // Save to server .env
      await fetch('/api/save-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });

      // Save to browser
      localStorage.setItem('gemini_api_key', key);
      geminiApiKeyInput.value = key;
      if (quickApiKeyInput) quickApiKeyInput.value = key;

      checkServerConfig(key);
      showToast('🎉 Free Gemini AI Key Activated Successfully!', 'success');
    } catch (err) {
      showToast(`Key Error: ${err.message}`, 'error');
    }
  }

  if (saveQuickKeyBtn) {
    saveQuickKeyBtn.addEventListener('click', () => {
      const key = quickApiKeyInput.value.trim();
      saveKeyToServerAndLocal(key);
    });
  }

  function saveSettings() {
    const key = geminiApiKeyInput.value.trim();
    const lang = defaultLanguageSelect.value;
    const naming = defaultNamingConvention.value;

    if (key) {
      saveKeyToServerAndLocal(key);
    } else {
      localStorage.removeItem('gemini_api_key');
    }

    // Save Studio / Brand Name
    const customBrand = (settingsStudioNameInput ? settingsStudioNameInput.value.trim() : '') || 
                       (studioBrandNameInput ? studioBrandNameInput.value.trim() : '');
    localStorage.setItem('studio_brand_name', customBrand);
    if (studioBrandNameInput) studioBrandNameInput.value = customBrand;
    if (settingsStudioNameInput) settingsStudioNameInput.value = customBrand;

    // Save Studio Config (WhatsApp & UPI)
    const customUpi = customUpiIdInput ? customUpiIdInput.value.trim() : '';
    const customWa = customWhatsappInput ? customWhatsappInput.value.trim() : '';
    if (customUpi || customWa) {
      fetch('/api/save-studio-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upiId: customUpi, whatsappNumber: customWa })
      }).then(() => {
        if (customUpi && displayUpiId) displayUpiId.textContent = customUpi;
      }).catch(e => console.warn(e));
    }

    localStorage.setItem('seo_language', lang);
    localStorage.setItem('seo_naming_style', naming);
    namingStyleSelect.value = naming;

    settingsModal.style.display = 'none';
    showToast('Studio settings saved!', 'success');
  }

  function updateAccountDisplay() {
    if (settingsUserTokenText) settingsUserTokenText.textContent = userToken;
    if (settingsAccountPlanBadge) {
      settingsAccountPlanBadge.className = 'account-plan-badge';
      if (currentUserData) {
        const { plan, creditsRemaining } = currentUserData;
        if (plan === 'lifetime') {
          settingsAccountPlanBadge.textContent = '👑 VIP Unlimited';
          settingsAccountPlanBadge.classList.add('vip');
        } else if (plan === 'pro') {
          settingsAccountPlanBadge.textContent = `Pro (${creditsRemaining} Credits)`;
          settingsAccountPlanBadge.classList.add('pro');
        } else if (plan === 'starter') {
          settingsAccountPlanBadge.textContent = `Starter (${creditsRemaining} Credits)`;
          settingsAccountPlanBadge.classList.add('starter');
        } else {
          settingsAccountPlanBadge.textContent = `${creditsRemaining} Free Credits`;
        }
      } else {
        settingsAccountPlanBadge.textContent = 'Free (10 Credits)';
      }
    }
  }

  function openSettingsModal() {
    updateAccountDisplay();
    if (settingsModal) settingsModal.style.display = 'flex';
  }

  function closeSettingsModal() {
    if (settingsModal) settingsModal.style.display = 'none';
  }

  if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettingsModal);
  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettingsModal);
  if (cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', closeSettingsModal);
  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);

  // Copy User Token
  if (copyUserTokenBtn) {
    copyUserTokenBtn.addEventListener('click', () => {
      copyToClipboard(userToken, 'Account Token copied! Is token ko save rakhein.');
    });
  }

  // Restore Account / Switch Device
  if (restoreAccountBtn && restoreAccountInput) {
    restoreAccountBtn.addEventListener('click', async () => {
      const q = restoreAccountInput.value.trim();
      if (!q) {
        showToast('Please enter your User Token (usr_xxx) or WhatsApp Phone Number', 'error');
        return;
      }

      restoreAccountBtn.disabled = true;
      restoreAccountBtn.textContent = 'Verifying...';

      try {
        const res = await fetch('/api/user/restore-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Account restore failed');
        }

        userToken = data.user.userToken;
        localStorage.setItem('payal_user_token', userToken);
        currentUserData = data.user;

        await fetchUserStatus();
        updateAccountDisplay();
        restoreAccountInput.value = '';

        showToast(`🎉 Welcome back! Account restored: ${data.user.plan.toUpperCase()} Plan active.`, 'success');
      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      } finally {
        restoreAccountBtn.disabled = false;
        restoreAccountBtn.textContent = 'Login / Restore';
      }
    });
  }

  // Pricing Modal: Quick switch to Restore Box
  if (pricingRestoreLink) {
    pricingRestoreLink.addEventListener('click', (e) => {
      e.preventDefault();
      closePricingModal();
      openSettingsModal();
      setTimeout(() => {
        if (restoreAccountInput) restoreAccountInput.focus();
      }, 250);
    });
  }

  // --------------------------------------------------
  // FILE SELECTION & DRAG-AND-DROP
  // --------------------------------------------------
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-over');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files);
    handleFilesAdded(files);
  });

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handleFilesAdded(files);
  });

  const batchMonitorSection = document.getElementById('batchMonitorSection');
  const batchCounterBadge = document.getElementById('batchCounterBadge');
  const batchProgressFill = document.getElementById('batchProgressFill');
  const batchTableBody = document.getElementById('batchTableBody');
  const monitorSubtext = document.getElementById('monitorSubtext');
  const monitorSpinner = document.getElementById('monitorSpinner');
  const stopBatchBtn = document.getElementById('stopBatchBtn');

  function handleFilesAdded(files) {
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      showToast('Please select valid image files.', 'error');
      return;
    }

    selectedFiles = [...selectedFiles, ...validFiles].slice(0, 200); // Support up to 200 images
    renderQueue();
  }

  function renderQueue() {
    if (selectedFiles.length === 0) {
      fileQueue.style.display = 'none';
      dropzone.querySelector('.dropzone-content').style.display = 'block';
      return;
    }

    dropzone.querySelector('.dropzone-content').style.display = 'none';
    fileQueue.style.display = 'block';
    queueCount.textContent = `${selectedFiles.length} image${selectedFiles.length > 1 ? 's' : ''} selected for batch processing`;
    queueList.innerHTML = '';

    selectedFiles.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'queue-item';

      const img = document.createElement('img');
      img.className = 'queue-thumb';
      img.src = URL.createObjectURL(file);

      const name = document.createElement('div');
      name.className = 'queue-name';
      name.textContent = `${index + 1}. ${file.name}`;
      name.title = file.name;

      item.appendChild(img);
      item.appendChild(name);
      queueList.appendChild(item);
    });
  }

  clearQueueBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedFiles = [];
    fileInput.value = '';
    renderQueue();
  });

  // --------------------------------------------------
  // REAL-TIME BATCH ANALYZE PROCESS
  // --------------------------------------------------
  let isBatchRunning = false;
  let shouldStopBatch = false;

  if (stopBatchBtn) {
    stopBatchBtn.addEventListener('click', () => {
      shouldStopBatch = true;
      stopBatchBtn.textContent = 'Stopping...';
    });
  }

  startAnalyzeBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (selectedFiles.length === 0) return;
    if (isBatchRunning) return;

    const apiKey = localStorage.getItem('gemini_api_key') || '';
    const niche = targetNicheInput.value.trim();
    const language = localStorage.getItem('seo_language') || 'English';
    const namingStyle = namingStyleSelect.value;
    const studioLocation = studioLocationInput ? studioLocationInput.value.trim() : '';
    const photoCategory = photoCategorySelect ? photoCategorySelect.value : '';
    const studioBrandName = studioBrandNameInput ? studioBrandNameInput.value.trim() : (localStorage.getItem('studio_brand_name') || '');
    const compressionMode = compressionModeSelect ? compressionModeSelect.value : (localStorage.getItem('seo_compression_mode') || 'webp');

    if (studioLocationInput) localStorage.setItem('payal_films_location', studioLocation);
    if (photoCategorySelect) localStorage.setItem('payal_films_category', photoCategory);
    if (studioBrandName) localStorage.setItem('studio_brand_name', studioBrandName);

    const total = selectedFiles.length;
    isBatchRunning = true;
    shouldStopBatch = false;
    startAnalyzeBtn.disabled = true;

    // Setup Batch Monitor
    batchMonitorSection.style.display = 'block';
    monitorSpinner.style.display = 'block';
    if (stopBatchBtn) {
      stopBatchBtn.style.display = 'inline-flex';
      stopBatchBtn.textContent = 'Stop';
    }
    batchCounterBadge.textContent = `0 / ${total} Completed (0%)`;
    batchProgressFill.style.width = '0%';
    monitorSubtext.textContent = `Starting AI visual batch analysis for ${total} images...`;

    // Clear and build live batch table rows
    batchTableBody.innerHTML = '';
    processedResults = [];
    resultsGrid.innerHTML = '';
    resultsSection.style.display = 'block';
    resultsCountBadge.textContent = `0 / ${total} images optimized`;

    selectedFiles.forEach((file, index) => {
      const tr = document.createElement('tr');
      tr.id = `batchRow-${index}`;
      const thumbUrl = URL.createObjectURL(file);

      tr.innerHTML = `
        <td style="color: var(--text-muted); font-weight: 700;">#${index + 1}</td>
        <td>
          <img src="${thumbUrl}" class="batch-thumb-img" alt="${escapeHtml(file.name)}" />
        </td>
        <td>
          <div class="orig-name-cell" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
        </td>
        <td id="statusCell-${index}">
          <span class="status-pill status-pill-queued">⏳ In Queue</span>
        </td>
        <td id="seoNameCell-${index}">
          <span style="color: var(--text-muted); font-size: 0.8rem;">Waiting to process...</span>
        </td>
        <td id="actionCell-${index}">
          <span style="color: var(--text-muted); font-size: 0.75rem;">-</span>
        </td>
      `;
      batchTableBody.appendChild(tr);
    });

    batchMonitorSection.scrollIntoView({ behavior: 'smooth' });

    // Process files with concurrency = 2
    let completedCount = 0;
    let nextIndex = 0;

    async function processWorker() {
      while (nextIndex < total && !shouldStopBatch) {
        const currentIndex = nextIndex++;
        const file = selectedFiles[currentIndex];
        const row = document.getElementById(`batchRow-${currentIndex}`);
        const statusCell = document.getElementById(`statusCell-${currentIndex}`);
        const seoNameCell = document.getElementById(`seoNameCell-${currentIndex}`);
        const actionCell = document.getElementById(`actionCell-${currentIndex}`);

        if (row) row.classList.add('active-processing');
        if (statusCell) {
          statusCell.innerHTML = '<span class="status-pill status-pill-analyzing">🔄 Analyzing AI...</span>';
        }
        monitorSubtext.textContent = `Analyzing image ${currentIndex + 1} of ${total}: ${file.name}...`;

        const formData = new FormData();
        formData.append('image', file);
        formData.append('apiKey', apiKey);
        formData.append('niche', niche);
        formData.append('language', language);
        formData.append('namingStyle', namingStyle);
        formData.append('studioLocation', studioLocation);
        formData.append('photoCategory', photoCategory);
        formData.append('studioBrandName', studioBrandName);
        formData.append('compressionMode', compressionMode);
        formData.append('userToken', userToken);

        try {
          const res = await fetch('/api/analyze-single', {
            method: 'POST',
            body: formData
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            if (res.status === 402 || errData.error === 'QUOTA_EXHAUSTED') {
              shouldStopBatch = true;
              fetchUserStatus();
              setTimeout(() => openPricingModal(), 400);
              throw new Error('Image Quota Exhausted! Please upgrade plan to continue.');
            }
            throw new Error(errData.error || `Server Error ${res.status}`);
          }

          const resData = await res.json();
          const itemResult = resData.result;
          processedResults.push(itemResult);

          // Update user credits in real-time
          fetchUserStatus();

          if (row) row.classList.remove('active-processing');
          if (statusCell) {
            statusCell.innerHTML = '<span class="status-pill status-pill-completed">✅ Completed</span>';
          }
          if (seoNameCell) {
            const savingsBadge = itemResult.isCompressed 
              ? ` <span style="display:inline-block; padding:1px 6px; border-radius:4px; font-size:0.75rem; background:rgba(16, 185, 129, 0.2); color:#34d399; font-weight:bold;">-${itemResult.savedPercent}%</span>`
              : '';
            seoNameCell.innerHTML = `<span class="seo-name-cell" title="${escapeHtml(itemResult.newFilename)}">${escapeHtml(itemResult.newFilename)}</span>${savingsBadge}`;
          }
          if (actionCell) {
            actionCell.innerHTML = `
              <a href="/api/download/${itemResult.fileId}?newName=${encodeURIComponent(itemResult.newFilename)}" class="btn btn-primary btn-mini-action" title="Download ${itemResult.isCompressed ? 'web-optimized' : 'renamed'} file">
                Download
              </a>
            `;
          }

          // Live append detailed result card
          const card = createResultCard(itemResult, processedResults.length - 1);
          resultsGrid.appendChild(card);
          resultsCountBadge.textContent = `${processedResults.length} / ${total} images optimized`;

        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
          if (row) row.classList.remove('active-processing');
          if (statusCell) {
            statusCell.innerHTML = `<span class="status-pill status-pill-error" title="${escapeHtml(err.message)}">❌ Error</span>`;
          }
          if (seoNameCell) {
            seoNameCell.innerHTML = `<span style="color: #f87171; font-size: 0.75rem;">${escapeHtml(err.message)}</span>`;
          }
          if (err.message.includes('Quota Exhausted')) {
            showToast('⚠️ Quota Finished: 10 Free credits completed. Please upgrade to continue batch processing!', 'error');
            break; // Stop worker loop
          }
        }

        completedCount++;
        const pct = Math.round((completedCount / total) * 100);
        batchProgressFill.style.width = `${pct}%`;
        batchCounterBadge.textContent = `${completedCount} / ${total} Completed (${pct}%)`;
      }
    }

    // Run 3 workers concurrently for optimal speed with 100+ images
    const concurrency = Math.min(3, total);
    const workers = [];
    for (let c = 0; c < concurrency; c++) {
      workers.push(processWorker());
    }

    await Promise.all(workers);

    // Batch Finished
    isBatchRunning = false;
    startAnalyzeBtn.disabled = false;
    monitorSpinner.style.display = 'none';
    if (stopBatchBtn) stopBatchBtn.style.display = 'none';

    if (shouldStopBatch) {
      monitorSubtext.innerHTML = `<strong>⚠️ Batch stopped by user. ${completedCount} of ${total} images processed.</strong>`;
      showToast(`Batch stopped. ${completedCount} images processed.`, 'error');
    } else {
      monitorSubtext.innerHTML = `<strong>🎉 Batch Processing Complete! All ${total} images have been visually analyzed and SEO-renamed.</strong>`;
      batchCounterBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      batchCounterBadge.style.color = '#34d399';
      batchCounterBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      showToast(`🎉 All ${total} images processed successfully!`, 'success');
    }
  });

  // --------------------------------------------------
  // RENDER RESULTS
  // --------------------------------------------------
  function renderResults(items) {
    resultsSection.style.display = 'block';
    resultsCountBadge.textContent = `${items.length} image${items.length > 1 ? 's' : ''} optimized`;
    resultsGrid.innerHTML = '';

    items.forEach((item, index) => {
      const card = createResultCard(item, index);
      resultsGrid.appendChild(card);
    });
  }

  function createResultCard(item, index) {
    const card = document.createElement('div');
    card.className = 'result-card';

    const ext = item.ext || '.jpg';
    const rawSeoName = item.data.seoFilename || 'optimized-image';
    const fullNewFilename = `${rawSeoName}${ext}`;

    const isAi = item.aiPowered;
    const engineTag = isAi 
      ? '<span class="card-engine-tag tag-ai">✨ Gemini Vision AI</span>' 
      : '<span class="card-engine-tag tag-heuristic">⚡ Smart Heuristic</span>';

    const origSizeKb = Math.round(item.originalSize / 1024);
    const displaySizeKb = Math.round((item.compressedSize || item.originalSize) / 1024);
    const activeBrand = localStorage.getItem('studio_brand_name') || '';

    const compressionBadge = item.isCompressed 
      ? `<span class="card-engine-tag" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4);">⚡ Web-Optimized (-${item.savedPercent}%)</span>`
      : '';

    // Dynamic Schema.org object using backend generated schema or personalized metadata
    const schemaObj = item.data.schemaSnippet || {
      "@context": "https://schema.org/",
      "@type": "ImageObject",
      "contentUrl": `${fullNewFilename}`,
      "name": item.data.title,
      "description": item.data.altText,
      "creator": {
        "@type": "Organization",
        "name": activeBrand || "Professional Photography Studio"
      },
      "copyrightHolder": {
        "@type": "Organization",
        "name": activeBrand || "Professional Photography Studio"
      },
      "author": activeBrand || "Professional Photography Studio"
    };

    const schemaString = JSON.stringify(schemaObj, null, 2);
    const htmlImgTag = `<img src="${fullNewFilename}" alt="${escapeHtml(item.data.altText)}" title="${escapeHtml(item.data.title)}" loading="lazy" />`;

    const brandBadge = activeBrand
      ? `<span class="card-engine-tag" style="background: rgba(99, 102, 241, 0.18); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.35);">🏢 ${escapeHtml(activeBrand)}</span>`
      : `<span class="card-engine-tag" style="background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35);">⚡ Personalized SEO</span>`;

    card.innerHTML = `
      <div class="card-top-bar">
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          ${engineTag}
          ${brandBadge}
          ${compressionBadge}
        </div>
        <div style="color: var(--text-muted); font-size: 0.8rem;">Image #${index + 1}</div>
      </div>

      <div class="card-body">
        <!-- Preview Column -->
        <div class="preview-col">
          <div class="image-preview-box">
            <img src="${item.previewUrl}" alt="${escapeHtml(item.data.altText)}" loading="lazy" />
          </div>

          <div class="image-meta-pills">
            ${item.isCompressed 
              ? `<span class="meta-pill" style="text-decoration: line-through; opacity: 0.6;" title="Original raw size">${origSizeKb} KB</span>
                 <span class="meta-pill" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 600;" title="Compressed web size">⚡ ${displaySizeKb} KB</span>`
              : `<span class="meta-pill">${origSizeKb} KB</span>`
            }
            <span class="meta-pill">${ext.toUpperCase().replace('.', '')}</span>
            <span class="meta-pill">${item.data.category || 'General'}</span>
          </div>

          <button class="btn btn-primary btn-download-single" id="dlBtn-${index}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download ${item.isCompressed ? 'Web Image' : 'Renamed Image'}
          </button>
        </div>

        <!-- Details Column -->
        <div class="details-col">
          <!-- Filename Rename Banner -->
          <div class="rename-banner">
            <div class="rename-header">SEO Filename Transformation</div>
            <div class="rename-flow">
              <span class="original-file-pill" title="${escapeHtml(item.originalName)}">${escapeHtml(item.originalName)}</span>
              <span class="rename-arrow">&rarr;</span>
              <div class="seo-file-input-wrapper">
                <input type="text" value="${escapeHtml(rawSeoName)}" id="seoNameInput-${index}" title="Click to customize this filename" />
                <span class="file-ext">${ext}</span>
                <button class="btn-icon-copy" id="copyFilenameBtn-${index}" title="Copy filename">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Fields Grid -->
          <div class="metadata-fields">
            <!-- Alt Text -->
            <div class="meta-field">
              <div class="field-header">
                <span class="field-label">Alt Text (Accessibility & Image Search)</span>
                <span class="field-counter">${item.data.altText.length} chars (Optimal &lt; 125)</span>
              </div>
              <div class="field-content-box">
                <div class="field-text">${escapeHtml(item.data.altText)}</div>
                <button class="btn-icon-copy" data-copy="${escapeHtml(item.data.altText)}" title="Copy Alt Text">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              </div>
            </div>

            <!-- Title Tag -->
            <div class="meta-field">
              <div class="field-header">
                <span class="field-label">Image Title Tag</span>
              </div>
              <div class="field-content-box">
                <div class="field-text">${escapeHtml(item.data.title)}</div>
                <button class="btn-icon-copy" data-copy="${escapeHtml(item.data.title)}" title="Copy Title">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              </div>
            </div>

            <!-- Caption -->
            <div class="meta-field">
              <div class="field-header">
                <span class="field-label">Caption (Article/Blog Body)</span>
              </div>
              <div class="field-content-box">
                <div class="field-text">${escapeHtml(item.data.caption)}</div>
                <button class="btn-icon-copy" data-copy="${escapeHtml(item.data.caption)}" title="Copy Caption">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              </div>
            </div>

            <!-- Description -->
            <div class="meta-field">
              <div class="field-header">
                <span class="field-label">Detailed Description / Pinterest / E-commerce</span>
              </div>
              <div class="field-content-box">
                <div class="field-text">${escapeHtml(item.data.description)}</div>
                <button class="btn-icon-copy" data-copy="${escapeHtml(item.data.description)}" title="Copy Description">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              </div>
            </div>

            <!-- Focus Keywords -->
            <div class="meta-field">
              <div class="field-header">
                <span class="field-label">Focus Keywords & Tags</span>
              </div>
              <div class="keyword-chips">
                ${(item.data.focusKeywords || []).map(kw => `<span class="kw-chip">${escapeHtml(kw)}</span>`).join('')}
              </div>
            </div>

            <!-- Developer Snippets Accordion -->
            <details class="code-preview-details">
              <summary class="code-preview-summary">📋 View HTML Tag & Schema.org JSON-LD Code</summary>
              <div class="code-preview-body">
&lt;!-- Optimized HTML Image Tag --&gt;
${escapeHtml(htmlImgTag)}

&lt;!-- Schema.org ImageObject --&gt;
&lt;script type="application/ld+json"&gt;
${escapeHtml(schemaString)}
&lt;/script&gt;
              </div>
            </details>
          </div>
        </div>
      </div>
    `;

    // Download Single Handler
    const dlBtn = card.querySelector(`#dlBtn-${index}`);
    const nameInput = card.querySelector(`#seoNameInput-${index}`);
    const copyFilenameBtn = card.querySelector(`#copyFilenameBtn-${index}`);

    dlBtn.addEventListener('click', () => {
      const currentName = nameInput.value.trim() || rawSeoName;
      const downloadName = `${currentName}${ext}`;
      window.location.href = `/api/download/${item.fileId}?newName=${encodeURIComponent(downloadName)}`;
      showToast(`Downloading: ${downloadName}`, 'success');
    });

    copyFilenameBtn.addEventListener('click', () => {
      const currentName = `${nameInput.value.trim() || rawSeoName}${ext}`;
      copyToClipboard(currentName, 'Filename copied!');
    });

    return card;
  }

  // --------------------------------------------------
  // BATCH ACTIONS: ZIP & CSV & COPY ALL
  // --------------------------------------------------

  // Download All as ZIP (Ultra-Reliable Native Stream)
  downloadAllZipBtn.addEventListener('click', () => {
    if (!processedResults || processedResults.length === 0) {
      showToast('⚠️ No processed images found to download!', 'error');
      return;
    }

    downloadAllZipBtn.disabled = true;
    showToast(`Starting ZIP download for ${processedResults.length} images...`, 'success');

    const itemsPayload = processedResults.map((item, index) => {
      const input = document.getElementById(`seoNameInput-${index}`);
      let baseName = (input && input.value.trim()) || item.data?.seoFilename || item.newFilename || 'photo';
      const ext = item.ext || (item.originalName ? '.' + item.originalName.split('.').pop() : '.jpg');
      if (ext && baseName.toLowerCase().endsWith(ext.toLowerCase())) {
        baseName = baseName.slice(0, -ext.length);
      }
      return {
        fileId: item.fileId,
        newFilename: `${baseName}${ext}`
      };
    });

    // Use native Form Submit for 100% reliable streaming directly to user's download folder
    // This eliminates browser RAM limits, supports 100+ large photos, and prevents blob cancel errors!
    try {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/download-zip';
      form.style.display = 'none';

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'itemsJson';
      input.value = JSON.stringify(itemsPayload);
      form.appendChild(input);

      document.body.appendChild(form);
      form.submit();

      setTimeout(() => {
        form.remove();
        downloadAllZipBtn.disabled = false;
        showToast('🎉 ZIP archive downloading!', 'success');
      }, 2000);
    } catch (err) {
      console.error('ZIP download error:', err);
      showToast('Error initiating ZIP download', 'error');
      downloadAllZipBtn.disabled = false;
    }
  });

  // Export to CSV
  exportCsvBtn.addEventListener('click', () => {
    if (processedResults.length === 0) return;

    const headers = ['Original File', 'New SEO Filename', 'Alt Text', 'Title Tag', 'Caption', 'Description', 'Focus Keywords', 'Tags'];
    const rows = processedResults.map((item, index) => {
      const input = document.getElementById(`seoNameInput-${index}`);
      const baseName = (input && input.value.trim()) || item.data.seoFilename;
      const finalName = `${baseName}${item.ext}`;

      return [
        `"${item.originalName.replace(/"/g, '""')}"`,
        `"${finalName.replace(/"/g, '""')}"`,
        `"${(item.data.altText || '').replace(/"/g, '""')}"`,
        `"${(item.data.title || '').replace(/"/g, '""')}"`,
        `"${(item.data.caption || '').replace(/"/g, '""')}"`,
        `"${(item.data.description || '').replace(/"/g, '""')}"`,
        `"${(item.data.focusKeywords || []).join('; ').replace(/"/g, '""')}"`,
        `"${(item.data.tags || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'image_seo_metadata.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('CSV metadata exported successfully!', 'success');
  });

  // Copy All Alt Texts
  copyAllAltBtn.addEventListener('click', () => {
    if (processedResults.length === 0) return;
    const allAlts = processedResults.map((item, index) => {
      const input = document.getElementById(`seoNameInput-${index}`);
      const name = (input && input.value.trim()) || item.data.seoFilename;
      return `${name}${item.ext} : ${item.data.altText}`;
    }).join('\n');

    copyToClipboard(allAlts, 'All Alt Texts copied to clipboard!');
  });

  // Generic delegated click for copy buttons
  document.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) {
      const textToCopy = copyBtn.getAttribute('data-copy');
      copyToClipboard(textToCopy, 'Copied to clipboard!');
    }
  });

  // --------------------------------------------------
  // UTILITIES
  // --------------------------------------------------
  function copyToClipboard(text, successMsg = 'Copied!') {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg, 'success');
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
  }

  // --------------------------------------------------
  // PAYMENT & SUBSCRIPTION SYSTEM
  // --------------------------------------------------
  function openPricingModal() {
    if (pricingPlansGrid) pricingPlansGrid.style.display = 'grid';
    if (upiPaymentSection) upiPaymentSection.style.display = 'none';
    if (pricingModal) pricingModal.style.display = 'flex';
  }

  function closePricingModal() {
    if (pricingModal) pricingModal.style.display = 'none';
  }

  async function fetchUserStatus() {
    try {
      const res = await fetch(`/api/user/status?userToken=${encodeURIComponent(userToken)}`);
      const data = await res.json();
      if (!data.success || !data.user) return;

      currentUserData = data.user;
      const { plan, creditsRemaining } = currentUserData;

      const mobileCreditsBadge = document.getElementById('mobileCreditsBadge');
      const mobileCreditCountText = document.getElementById('mobileCreditCountText');

      if (userCreditsBadge && creditCountText) {
        userCreditsBadge.classList.remove('vip', 'exhausted');

        if (plan === 'lifetime') {
          creditCountText.textContent = '👑 VIP Unlimited';
          userCreditsBadge.classList.add('vip');
        } else if (creditsRemaining <= 0) {
          creditCountText.textContent = '0 Credits (Upgrade)';
          userCreditsBadge.classList.add('exhausted');
        } else if (plan === 'free') {
          creditCountText.textContent = `${creditsRemaining} Free Credits`;
        } else {
          creditCountText.textContent = `${creditsRemaining} Credits`;
        }
      }

      if (mobileCreditsBadge && mobileCreditCountText) {
        mobileCreditsBadge.classList.remove('vip', 'exhausted');
        if (plan === 'lifetime') {
          mobileCreditCountText.textContent = '👑 VIP';
          mobileCreditsBadge.classList.add('vip');
        } else if (creditsRemaining <= 0) {
          mobileCreditCountText.textContent = '0 Free';
          mobileCreditsBadge.classList.add('exhausted');
        } else {
          mobileCreditCountText.textContent = `${creditsRemaining} Free`;
        }
      }

      // Update button labels in pricing modal if user is on a plan
      const lifetimeBtn = document.querySelector('[data-select-plan="lifetime"]');
      if (lifetimeBtn && plan === 'lifetime') {
        lifetimeBtn.textContent = '✅ VIP Active';
        lifetimeBtn.disabled = true;
      }

      updateAccountDisplay();
    } catch (e) {
      console.warn('Could not fetch user status:', e);
    }
  }

  // Mobile Navigation Drawer Toggle & Outside Click
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const headerActions = document.getElementById('headerActions');
  const mobileCreditsBadge = document.getElementById('mobileCreditsBadge');

  if (mobileMenuToggle && headerActions) {
    mobileMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = headerActions.classList.toggle('mobile-open');
      mobileMenuToggle.classList.toggle('active', isOpen);
      mobileMenuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (headerActions.classList.contains('mobile-open') &&
          !headerActions.contains(e.target) &&
          !mobileMenuToggle.contains(e.target)) {
        headerActions.classList.remove('mobile-open');
        mobileMenuToggle.classList.remove('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Auto-close menu when tapping action buttons inside it
    headerActions.querySelectorAll('button, .user-credits-badge').forEach(btn => {
      btn.addEventListener('click', () => {
        headerActions.classList.remove('mobile-open');
        mobileMenuToggle.classList.remove('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  if (mobileCreditsBadge) {
    mobileCreditsBadge.addEventListener('click', openPricingModal);
  }

  // Open / Close Pricing Modal
  if (openPricingBtn) openPricingBtn.addEventListener('click', openPricingModal);
  if (userCreditsBadge) userCreditsBadge.addEventListener('click', openPricingModal);
  if (closePricingBtn) closePricingBtn.addEventListener('click', closePricingModal);
  if (pricingModal) {
    pricingModal.addEventListener('click', (e) => {
      if (e.target === pricingModal) closePricingModal();
    });
  }

  // Back to plans list
  if (backToPlansBtn) {
    backToPlansBtn.addEventListener('click', () => {
      upiPaymentSection.style.display = 'none';
      pricingPlansGrid.style.display = 'grid';
    });
  }

  // Plan Selection & Dynamic UPI QR Code Generation
  document.querySelectorAll('[data-select-plan]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const planId = btn.getAttribute('data-select-plan');
      activePlanId = planId;

      showToast('Generating Dynamic UPI QR Code...', 'success');
      btn.disabled = true;
      const originalText = btn.innerHTML;
      btn.textContent = 'Generating QR...';

      try {
        const res = await fetch('/api/payment/generate-qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId, userToken })
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to generate QR');

        paymentQrImg.src = data.qrDataUrl;
        displayUpiId.textContent = data.upiId;
        selectedPlanPill.textContent = `Selected: ${data.planName} (₹${data.amount})`;

        // Reset screenshot and customer inputs state
        selectedScreenshotFile = null;
        if (customerNameInput) customerNameInput.value = '';
        if (customerPhoneInput) customerPhoneInput.value = '';
        if (customerUtrInput) customerUtrInput.value = '';
        if (paymentScreenshotInput) paymentScreenshotInput.value = '';
        if (screenshotPreviewWrap) screenshotPreviewWrap.style.display = 'none';
        if (screenshotPrompt) screenshotPrompt.style.display = 'flex';
        if (approvalWaitCard) approvalWaitCard.style.display = 'none';
        if (sendWhatsAppProofBtn) {
          sendWhatsAppProofBtn.style.display = 'flex';
          sendWhatsAppProofBtn.disabled = false;
          sendWhatsAppProofBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            Send Screenshot on WhatsApp
          `;
        }
        if (verifyPaymentBtn) verifyPaymentBtn.disabled = true;
        if (aiVerifyStatus) aiVerifyStatus.style.display = 'none';

        // Switch to Step 2
        pricingPlansGrid.style.display = 'none';
        upiPaymentSection.style.display = 'block';

      } catch (err) {
        showToast(`QR Generation Error: ${err.message}`, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  });

  // Copy UPI ID button
  if (copyUpiIdBtn) {
    copyUpiIdBtn.addEventListener('click', () => {
      const upiText = displayUpiId.textContent.trim();
      copyToClipboard(upiText, 'UPI ID copied to clipboard!');
    });
  }

  // Screenshot Selection & Drag and Drop Handling
  function handleScreenshotSelected(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please upload a valid image screenshot of the payment receipt.', 'error');
      return;
    }
    selectedScreenshotFile = file;
    screenshotImgPreview.src = URL.createObjectURL(file);
    screenshotFileName.textContent = file.name;
    screenshotPrompt.style.display = 'none';
    screenshotPreviewWrap.style.display = 'flex';
    if (verifyPaymentBtn) verifyPaymentBtn.disabled = false;
    showToast('Screenshot selected! Now click "Send Screenshot on WhatsApp".', 'success');
  }

  if (screenshotDropzone && paymentScreenshotInput) {
    screenshotDropzone.addEventListener('click', (e) => {
      if (e.target !== paymentScreenshotInput) {
        paymentScreenshotInput.click();
      }
    });

    paymentScreenshotInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleScreenshotSelected(e.target.files[0]);
      }
    });

    ['dragenter', 'dragover'].forEach(ev => {
      screenshotDropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        screenshotDropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(ev => {
      screenshotDropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        screenshotDropzone.classList.remove('drag-over');
      });
    });

    screenshotDropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files[0]) {
        handleScreenshotSelected(files[0]);
      }
    });
  }

  // --------------------------------------------------
  // WHATSAPP PROOF SUBMISSION & APPROVAL POLLING
  // --------------------------------------------------
  let approvalPollTimer = null;

  if (sendWhatsAppProofBtn) {
    sendWhatsAppProofBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!activePlanId) {
        showToast('Please select a plan first', 'error');
        return;
      }

      sendWhatsAppProofBtn.disabled = true;
      sendWhatsAppProofBtn.innerHTML = '<span>⏳ Preparing WhatsApp Link...</span>';

      const formData = new FormData();
      formData.append('planId', activePlanId);
      formData.append('userToken', userToken);
      if (customerNameInput) formData.append('customerName', customerNameInput.value.trim());
      if (customerPhoneInput) formData.append('customerPhone', customerPhoneInput.value.trim());
      if (customerUtrInput) formData.append('customerUtr', customerUtrInput.value.trim());
      if (selectedScreenshotFile) formData.append('screenshot', selectedScreenshotFile);

      try {
        const res = await fetch('/api/payment/submit-whatsapp-proof', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to submit request');
        }

        // Open WhatsApp in new tab
        window.open(data.whatsappUrl, '_blank');

        // Show waiting card
        if (approvalWaitCard) approvalWaitCard.style.display = 'flex';
        sendWhatsAppProofBtn.style.display = 'none';
        showToast('WhatsApp opened! Send the message & screenshot to Studio.', 'success');

        // Poll for studio manual approval every 4 seconds
        if (approvalPollTimer) clearInterval(approvalPollTimer);
        approvalPollTimer = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/user/status?userToken=${encodeURIComponent(userToken)}`);
            const statusData = await statusRes.json();
            if (statusData && statusData.user && (statusData.user.plan === activePlanId || statusData.user.plan === 'lifetime')) {
              clearInterval(approvalPollTimer);
              approvalPollTimer = null;
              await fetchUserStatus();
              showToast(`🎉 Studio Approved your payment! Account unlocked for ${statusData.user.plan.toUpperCase()}!`, 'success');
              setTimeout(() => {
                closePricingModal();
              }, 2200);
            }
          } catch (err) {
            console.warn('Approval polling check:', err);
          }
        }, 4000);

      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
        sendWhatsAppProofBtn.disabled = false;
        sendWhatsAppProofBtn.innerHTML = `Send Screenshot on WhatsApp`;
      }
    });
  }

  // Optional AI Verification Button
  if (verifyPaymentBtn) {
    verifyPaymentBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!selectedScreenshotFile) {
        showToast('Please upload a payment screenshot first', 'error');
        return;
      }
      if (!activePlanId) {
        showToast('Please select a plan first', 'error');
        return;
      }

      verifyPaymentBtn.disabled = true;
      if (aiVerifyStatus) aiVerifyStatus.style.display = 'flex';
      if (verifyStatusText) verifyStatusText.textContent = 'AI is reading payment receipt, amount & UTR with Gemini Vision...';

      const formData = new FormData();
      formData.append('screenshot', selectedScreenshotFile);
      formData.append('planId', activePlanId);
      formData.append('userToken', userToken);
      const activeKey = localStorage.getItem('gemini_api_key') || '';
      if (activeKey) formData.append('apiKey', activeKey);

      try {
        const res = await fetch('/api/payment/verify-screenshot', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (res.ok && data.success && data.approved) {
          if (verifyStatusText) verifyStatusText.textContent = `✅ Approved! Payment of ₹${data.detectedAmount} verified. Upgraded!`;
          showToast(`🎉 ${data.message}`, 'success');
          await fetchUserStatus();

          setTimeout(() => {
            closePricingModal();
          }, 2000);
        } else {
          const errMsg = data.error || 'Verification failed. Could not confirm payment receipt details.';
          if (verifyStatusText) verifyStatusText.textContent = `❌ ${errMsg}`;
          showToast(errMsg, 'error');
          verifyPaymentBtn.disabled = false;
        }
      } catch (err) {
        if (verifyStatusText) verifyStatusText.textContent = `❌ Error: ${err.message}`;
        showToast(`Verification Error: ${err.message}`, 'error');
        verifyPaymentBtn.disabled = false;
      }
    });
  }

  // --------------------------------------------------
  // STUDIO ADMIN PANEL (MANUAL APPROVALS)
  // --------------------------------------------------
  let currentAdminSecret = sessionStorage.getItem('payal_admin_secret') || '';

  function openAdminModal() {
    if (!adminModal) return;
    adminModal.style.display = 'flex';

    if (currentAdminSecret) {
      if (adminAuthBox) adminAuthBox.style.display = 'none';
      if (adminContentBox) adminContentBox.style.display = 'block';
      loadAdminRequests();
    } else {
      if (adminAuthBox) adminAuthBox.style.display = 'block';
      if (adminContentBox) adminContentBox.style.display = 'none';
      if (adminSecretInput) adminSecretInput.value = '';
    }
  }

  function closeAdminModal() {
    if (adminModal) adminModal.style.display = 'none';
  }

  if (openAdminBtn) openAdminBtn.addEventListener('click', openAdminModal);
  if (closeAdminBtn) closeAdminBtn.addEventListener('click', closeAdminModal);
  if (adminModal) {
    adminModal.addEventListener('click', (e) => {
      if (e.target === adminModal) closeAdminModal();
    });
  }

  if (adminLoginBtn && adminSecretInput) {
    adminLoginBtn.addEventListener('click', async () => {
      const secret = adminSecretInput.value.trim();
      if (!secret) {
        showToast('Please enter Admin Secret password', 'error');
        return;
      }

      adminLoginBtn.disabled = true;
      adminLoginBtn.textContent = 'Verifying...';

      try {
        const res = await fetch(`/api/admin/pending-requests?secret=${encodeURIComponent(secret)}`);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Invalid Admin Secret');

        currentAdminSecret = secret;
        sessionStorage.setItem('payal_admin_secret', secret);
        if (adminAuthBox) adminAuthBox.style.display = 'none';
        if (adminContentBox) adminContentBox.style.display = 'block';
        renderAdminRequests(data.requests || []);
        showToast('Studio Admin Panel Unlocked!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        adminLoginBtn.disabled = false;
        adminLoginBtn.textContent = 'Unlock Panel';
      }
    });
  }

  async function loadAdminRequests() {
    if (!currentAdminSecret) return;
    try {
      const res = await fetch(`/api/admin/pending-requests?secret=${encodeURIComponent(currentAdminSecret)}`);
      const data = await res.json();
      if (data.success) {
        renderAdminRequests(data.requests || []);
      }
    } catch (e) {
      console.warn('Load admin requests error:', e);
    }
  }

  if (refreshAdminBtn) refreshAdminBtn.addEventListener('click', loadAdminRequests);

  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', () => {
      currentAdminSecret = '';
      sessionStorage.removeItem('payal_admin_secret');
      if (adminAuthBox) adminAuthBox.style.display = 'block';
      if (adminContentBox) adminContentBox.style.display = 'none';
      if (adminSecretInput) adminSecretInput.value = '';
      showToast('Admin Panel Logged Out & Locked', 'info');
    });
  }

  function renderAdminRequests(requests) {
    const pending = requests.filter(r => r.status === 'PENDING');
    if (pendingRequestsCountBadge) {
      pendingRequestsCountBadge.textContent = `${pending.length} Pending Approval`;
    }

    if (!adminRequestsTableBody) return;
    if (requests.length === 0) {
      adminRequestsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No payment requests found yet.</td></tr>';
      return;
    }

    adminRequestsTableBody.innerHTML = '';
    requests.forEach(req => {
      const tr = document.createElement('tr');
      const dateStr = new Date(req.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
      const thumb = req.screenshotUrl ? `<a href="${req.screenshotUrl}" target="_blank" class="admin-thumb-link"><img src="${req.screenshotUrl}" alt="Proof" title="Click to view full screenshot" /></a>` : '<span style="color:var(--text-muted);">No File</span>';
      const isPending = req.status === 'PENDING';

      tr.innerHTML = `
        <td style="color: var(--text-muted); font-size: 0.75rem;">${dateStr}</td>
        <td>
          <strong>${escapeHtml(req.customerName || 'Client')}</strong>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(req.customerPhone || '')}</div>
        </td>
        <td>
          <span style="font-weight: 700; color: #34d399;">₹${req.amount}</span>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(req.planName)}</div>
        </td>
        <td>${thumb}</td>
        <td><code>${escapeHtml(req.utrNumber || 'N/A')}</code></td>
        <td><code style="font-size: 0.72rem; color: #93c5fd;">${escapeHtml(req.userToken)}</code></td>
        <td>
          ${isPending ? `
            <button class="btn-approve-action" data-approve-id="${req.id}">✅ Allow</button>
            <button class="btn-reject-action" data-reject-id="${req.id}">❌</button>
          ` : `
            <span style="font-size: 0.75rem; font-weight: 700; color: ${req.status === 'APPROVED' ? '#10b981' : '#ef4444'};">
              ${req.status}
            </span>
          `}
        </td>
      `;
      adminRequestsTableBody.appendChild(tr);
    });

    // Attach click events
    adminRequestsTableBody.querySelectorAll('[data-approve-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const reqId = btn.getAttribute('data-approve-id');
        btn.disabled = true;
        btn.textContent = 'Approving...';
        try {
          const res = await fetch('/api/admin/approve-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: reqId, secret: currentAdminSecret })
          });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.error || 'Approval failed');
          showToast(data.message || 'Payment Approved & User Upgraded!', 'success');
          loadAdminRequests();
        } catch (err) {
          showToast(`Error: ${err.message}`, 'error');
          btn.disabled = false;
        }
      });
    });

    adminRequestsTableBody.querySelectorAll('[data-reject-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const reqId = btn.getAttribute('data-reject-id');
        if (!confirm('Are you sure you want to reject this request?')) return;
        try {
          const res = await fetch('/api/admin/reject-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: reqId, secret: currentAdminSecret })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Rejection failed');
          showToast('Request marked as rejected.', 'success');
          loadAdminRequests();
        } catch (err) {
          showToast(`Error: ${err.message}`, 'error');
        }
      });
    });
  }

  // Direct Manual User Upgrade
  if (manualUpgradeBtn && manualUserTokenInput && manualPlanSelect) {
    manualUpgradeBtn.addEventListener('click', async () => {
      const token = manualUserTokenInput.value.trim();
      const plan = manualPlanSelect.value;
      if (!token) {
        showToast('Please enter customer User Token', 'error');
        return;
      }

      manualUpgradeBtn.disabled = true;
      manualUpgradeBtn.textContent = 'Allowing...';

      try {
        const res = await fetch('/api/admin/manual-upgrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userToken: token, planId: plan, secret: currentAdminSecret })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to upgrade user');
        showToast(`🎉 User ${token} upgraded to ${plan.toUpperCase()}!`, 'success');
        manualUserTokenInput.value = '';
      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      } finally {
        manualUpgradeBtn.disabled = false;
        manualUpgradeBtn.textContent = 'Approve & Allow';
      }
    });
  }

  // Load configuration & user status on start
  loadSettings();
  fetchUserStatus();
});

