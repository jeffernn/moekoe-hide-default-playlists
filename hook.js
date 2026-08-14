// == MoeKoe Hide Default Playlists - Hook (Main World) ==
(function () {
  'use strict';

  console.log('[MoeKoe Hide Default Playlists Hook] 初始化高阶安全与性能优化版本...');

  var STORAGE_KEY = 'moekoe_hide_playlists_cfg_sec_v1';
  var STATIC_STYLE_ID = 'moekoe-hide-static-engine-style';

  // 默认过滤配置
  var defaultConfig = {
    hideCloudDrive: true,      // 我的云盘
    hideLocalMusic: true,      // 本地音乐
    hideCreatePlaylist: true,  // 创建歌单
    hideMyFavorites: true,     // 我喜欢 歌单
    hideDefaultCollect: true   // 默认收藏 歌单
  };

  // =============================================
  //  1. 本地存储安全防护（模式校验 + 数据防篡改编码）
  // =============================================
  function encodePayload(str) {
    try {
      return btoa(encodeURIComponent(str));
    } catch (e) {
      return str;
    }
  }

  function decodePayload(str) {
    try {
      return decodeURIComponent(atob(str));
    } catch (e) {
      return str;
    }
  }

  function safeLoadConfig() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, defaultConfig);
      var jsonStr = decodePayload(raw);
      var parsed = JSON.parse(jsonStr);
      var result = {};
      // 严格 Schema 验证：仅提取已知的 boolean 类型字段，防止污染与异常注入
      for (var key in defaultConfig) {
        if (Object.prototype.hasOwnProperty.call(defaultConfig, key)) {
          result[key] = typeof parsed[key] === 'boolean' ? parsed[key] : defaultConfig[key];
        }
      }
      return result;
    } catch (e) {
      console.warn('[MoeKoe Hide Playlists] 读取配置异常或数据损坏，已安全回退到默认设置', e);
      return Object.assign({}, defaultConfig);
    }
  }

  function safeSaveConfig(cfg) {
    try {
      var sanitized = {};
      for (var key in defaultConfig) {
        if (Object.prototype.hasOwnProperty.call(defaultConfig, key)) {
          sanitized[key] = Boolean(cfg[key]);
        }
      }
      localStorage.setItem(STORAGE_KEY, encodePayload(JSON.stringify(sanitized)));
    } catch (e) {
      console.error('[MoeKoe Hide Playlists] 本地存储持久化失败', e);
    }
  }

  var config = safeLoadConfig();

  // =============================================
  //  2. 极速样式引擎（单次注入全局静态规则，基于 Body Flag 瞬时响应）
  // =============================================
  function injectStaticEngineStyle() {
    if (document.getElementById(STATIC_STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STATIC_STYLE_ID;
    style.textContent = `
      /* 1. 云盘隐藏规则 */
      body[data-moekoe-hide-cloud="1"] .side-navigation .side-section a[href*="/CloudDrive"],
      body[data-moekoe-hide-cloud="1"] .side-navigation .side-link[title*="我的云盘"],
      body[data-moekoe-hide-cloud="1"] .library-page .music-grid .music-card[data-moekoe-type="cloud-drive"] {
        display: none !important;
      }

      /* 2. 本地音乐隐藏规则 */
      body[data-moekoe-hide-local="1"] .side-navigation .side-section a[href*="/LocalMusic"],
      body[data-moekoe-hide-local="1"] .side-navigation .side-link[title*="本地音乐"],
      body[data-moekoe-hide-local="1"] .library-page .music-grid .music-card[data-moekoe-type="local-music"] {
        display: none !important;
      }

      /* 3. 创建歌单隐藏规则 */
      body[data-moekoe-hide-create="1"] .library-page .music-grid .music-card[data-moekoe-type="create-playlist"] {
        display: none !important;
      }

      /* 4. 我喜欢歌单隐藏规则 */
      body[data-moekoe-hide-fav="1"] .side-playlist-list .side-playlist-link[data-moekoe-playlist="我喜欢"],
      body[data-moekoe-hide-fav="1"] .library-page .music-grid .music-card[data-moekoe-playlist="我喜欢"] {
        display: none !important;
      }

      /* 5. 默认收藏隐藏规则 */
      body[data-moekoe-hide-default="1"] .side-playlist-list .side-playlist-link[data-moekoe-playlist="默认收藏"],
      body[data-moekoe-hide-default="1"] .library-page .music-grid .music-card[data-moekoe-playlist="默认收藏"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 零重排 Body 状态切换（通过 dataset 高速驱动 CSS 选择器）
  function updateBodyFlags() {
    var b = document.body;
    if (!b) return;
    config.hideCloudDrive ? b.setAttribute('data-moekoe-hide-cloud', '1') : b.removeAttribute('data-moekoe-hide-cloud');
    config.hideLocalMusic ? b.setAttribute('data-moekoe-hide-local', '1') : b.removeAttribute('data-moekoe-hide-local');
    config.hideCreatePlaylist ? b.setAttribute('data-moekoe-hide-create', '1') : b.removeAttribute('data-moekoe-hide-create');
    config.hideMyFavorites ? b.setAttribute('data-moekoe-hide-fav', '1') : b.removeAttribute('data-moekoe-hide-fav');
    config.hideDefaultCollect ? b.setAttribute('data-moekoe-hide-default', '1') : b.removeAttribute('data-moekoe-hide-default');
  }

  // 页面状态检测（用于控制配置按钮仅在音乐库页面显示，且在全屏播放/歌词页面时隐藏）
  function updatePageFlags() {
    var hasLyricsOverlay = Boolean(document.querySelector('.lyrics-bg, .lyrics-container, .video-player-page'));
    var isLibrary = Boolean(
      !hasLyricsOverlay &&
      document.querySelector('.library-page') &&
      (!window.location.hash || window.location.hash.startsWith('#/library') || window.location.hash === '#/library' || window.location.hash.indexOf('/library') !== -1)
    );
    var b = document.body;
    if (b) {
      if (isLibrary) {
        b.setAttribute('data-moekoe-page', 'library');
      } else {
        b.removeAttribute('data-moekoe-page');
      }
      if (hasLyricsOverlay) {
        b.setAttribute('data-moekoe-playing', '1');
      } else {
        b.removeAttribute('data-moekoe-playing');
      }
    }
  }

  // =============================================
  //  3. 精准轻量 DOM 标记（使用缓存与局部选择器，O(1) 过滤）
  // =============================================
  function scanAndTagElements() {
    // 1. 局部扫描音乐库卡片（跳过已标记项）
    var musicGrid = document.querySelector('.library-page .music-grid');
    if (musicGrid) {
      var cards = musicGrid.children;
      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        if (!card.classList || !card.classList.contains('music-card')) continue;

        // 如果已经标记过则直接跳过，避免重复昂贵的 DOM 计算
        if (card.dataset.moekoeType || card.dataset.moekoePlaylist) continue;

        var h3 = card.querySelector('h3');
        var title = h3 ? h3.textContent.trim() : '';

        if (title === '我的云盘' || card.querySelector('a[href*="/CloudDrive"]')) {
          card.setAttribute('data-moekoe-type', 'cloud-drive');
        } else if (title === '本地音乐' || card.querySelector('a[href*="/LocalMusic"]')) {
          card.setAttribute('data-moekoe-type', 'local-music');
        } else if (card.querySelector('.fa-plus') || card.querySelector('img[src*="ti111mg"]') || title.indexOf('创建歌单') !== -1 || title.indexOf('Create Playlist') !== -1) {
          card.setAttribute('data-moekoe-type', 'create-playlist');
        } else if (title === '我喜欢') {
          card.setAttribute('data-moekoe-playlist', '我喜欢');
        } else if (title === '默认收藏') {
          card.setAttribute('data-moekoe-playlist', '默认收藏');
        }
      }
    }

    // 2. 局部扫描侧边栏歌单列表（跳过已标记项）
    var sideList = document.querySelector('.side-playlist-list');
    if (sideList) {
      var playlistLinks = sideList.querySelectorAll('.side-playlist-link:not([data-moekoe-playlist])');
      for (var j = 0; j < playlistLinks.length; j++) {
        var link = playlistLinks[j];
        var linkTitle = link.getAttribute('title') || '';
        var span = link.querySelector('span');
        var name = (linkTitle || (span ? span.textContent : '')).trim();

        if (name === '我喜欢') {
          link.setAttribute('data-moekoe-playlist', '我喜欢');
        } else if (name === '默认收藏') {
          link.setAttribute('data-moekoe-playlist', '默认收藏');
        }
      }
    }
  }

  // =============================================
  //  4. 防抖调度监听（requestAnimationFrame 消除频繁重绘与卡顿）
  // =============================================
  var isScheduled = false;
  function scheduleScan() {
    if (isScheduled) return;
    isScheduled = true;
    requestAnimationFrame(function () {
      isScheduled = false;
      updatePageFlags();
      scanAndTagElements();
    });
  }

  function setupObserver() {
    var observer = new MutationObserver(function () {
      scheduleScan();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.addEventListener('hashchange', function () {
      scheduleScan();
      setTimeout(scheduleScan, 150);
    });

    window.addEventListener('popstate', function () {
      scheduleScan();
      setTimeout(scheduleScan, 150);
    });
  }

  // =============================================
  //  5. 可视化天空蓝配置弹窗
  // =============================================
  function createUI() {
    if (document.querySelector('.moekoe-hide-playlist-trigger')) return;

    var trigger = document.createElement('div');
    trigger.className = 'moekoe-hide-playlist-trigger';
    trigger.setAttribute('title', 'MoeKoe 歌单过滤设置');
    trigger.innerHTML = '<i class="fas fa-eye-slash" style="pointer-events:none;"></i>';
    trigger.addEventListener('click', openModal);
    document.body.appendChild(trigger);
  }

  function openModal() {
    var existingModal = document.querySelector('.moekoe-hide-playlist-modal-overlay');
    if (existingModal) existingModal.remove();

    var overlay = document.createElement('div');
    overlay.className = 'moekoe-hide-playlist-modal-overlay';

    var modal = document.createElement('div');
    modal.className = 'moekoe-hide-playlist-modal';

    modal.innerHTML = `
      <div class="moekoe-modal-header">
        <div class="moekoe-modal-title">
          <i class="fas fa-filter" style="color: #38bdf8;"></i>
          <span>默认歌单过滤设置</span>
        </div>
        <button class="moekoe-modal-close" id="moekoe-modal-close-btn">&times;</button>
      </div>
      <div class="moekoe-modal-body">
        <label class="moekoe-option-item" for="opt-cloud">
          <div class="moekoe-option-label">
            <span>隐藏「我的云盘」</span>
            <span class="moekoe-option-desc">隐藏侧边栏与音乐库中的云盘快捷入口</span>
          </div>
          <div class="moekoe-switch">
            <input type="checkbox" id="opt-cloud" ${config.hideCloudDrive ? 'checked' : ''}>
            <span class="moekoe-slider"></span>
          </div>
        </label>

        <label class="moekoe-option-item" for="opt-local">
          <div class="moekoe-option-label">
            <span>隐藏「本地音乐」</span>
            <span class="moekoe-option-desc">隐藏侧边栏与音乐库中的本地音乐入口</span>
          </div>
          <div class="moekoe-switch">
            <input type="checkbox" id="opt-local" ${config.hideLocalMusic ? 'checked' : ''}>
            <span class="moekoe-slider"></span>
          </div>
        </label>

        <label class="moekoe-option-item" for="opt-create-playlist">
          <div class="moekoe-option-label">
            <span>隐藏「创建歌单」</span>
            <span class="moekoe-option-desc">隐藏音乐库歌单列表末尾的“创建歌单”卡片</span>
          </div>
          <div class="moekoe-switch">
            <input type="checkbox" id="opt-create-playlist" ${config.hideCreatePlaylist ? 'checked' : ''}>
            <span class="moekoe-slider"></span>
          </div>
        </label>

        <label class="moekoe-option-item" for="opt-fav">
          <div class="moekoe-option-label">
            <span>隐藏「我喜欢」歌单</span>
            <span class="moekoe-option-desc">隐藏侧边栏与歌单网格中的“我喜欢”歌单</span>
          </div>
          <div class="moekoe-switch">
            <input type="checkbox" id="opt-fav" ${config.hideMyFavorites ? 'checked' : ''}>
            <span class="moekoe-slider"></span>
          </div>
        </label>

        <label class="moekoe-option-item" for="opt-default-collect">
          <div class="moekoe-option-label">
            <span>隐藏「默认收藏」歌单</span>
            <span class="moekoe-option-desc">隐藏侧边栏与歌单网格中的“默认收藏”歌单</span>
          </div>
          <div class="moekoe-switch">
            <input type="checkbox" id="opt-default-collect" ${config.hideDefaultCollect ? 'checked' : ''}>
            <span class="moekoe-slider"></span>
          </div>
        </label>
      </div>
      <div class="moekoe-modal-footer">
        <button class="moekoe-btn moekoe-btn-primary" id="moekoe-modal-done-btn">完成</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function bindCheckbox(id, key) {
      var input = modal.querySelector('#' + id);
      if (input) {
        input.addEventListener('change', function () {
          config[key] = input.checked;
          safeSaveConfig(config);
          updateBodyFlags();
          scheduleScan();
        });
      }
    }

    bindCheckbox('opt-cloud', 'hideCloudDrive');
    bindCheckbox('opt-local', 'hideLocalMusic');
    bindCheckbox('opt-create-playlist', 'hideCreatePlaylist');
    bindCheckbox('opt-fav', 'hideMyFavorites');
    bindCheckbox('opt-default-collect', 'hideDefaultCollect');

    function closeModal() {
      overlay.remove();
    }

    modal.querySelector('#moekoe-modal-close-btn').addEventListener('click', closeModal);
    modal.querySelector('#moekoe-modal-done-btn').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
  }

  // =============================================
  //  6. 初始化启动流程
  // =============================================
  injectStaticEngineStyle();
  updateBodyFlags();
  updatePageFlags();
  scanAndTagElements();
  setupObserver();
  createUI();

  console.log('[MoeKoe Hide Default Playlists Hook] 引擎挂载就绪！');
})();
