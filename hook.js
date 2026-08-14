// == MoeKoe Hide Default Playlists - Hook (Main World) ==
(function () {
  'use strict';

  console.log('[MoeKoe Hide Default Playlists Hook] 正在初始化...');

  var STORAGE_KEY = 'moekoe_hide_default_playlists_config';
  var DYNAMIC_STYLE_ID = 'moekoe-hide-dynamic-style';

  // 默认配置
  var defaultConfig = {
    hideCloudDrive: true,      // 我的云盘
    hideLocalMusic: true,      // 本地音乐
    hideMyFavorites: true,     // 我喜欢 歌单
    hideDefaultCollect: true,  // 默认收藏 歌单
    hideListenSection: false   // 音乐库顶部「我喜欢听」区域
  };

  // 读取配置
  function loadConfig() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return Object.assign({}, defaultConfig, JSON.parse(saved));
      }
    } catch (e) {
      console.warn('[MoeKoe Hide Playlists] 读取配置失败，使用默认配置', e);
    }
    return Object.assign({}, defaultConfig);
  }

  // 保存配置
  function saveConfig(cfg) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch (e) {
      console.error('[MoeKoe Hide Playlists] 保存配置失败', e);
    }
  }

  var config = loadConfig();

  // =============================================
  //  1. 动态生成并注入 CSS 样式
  // =============================================
  function applyDynamicStyle() {
    var style = document.getElementById(DYNAMIC_STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = DYNAMIC_STYLE_ID;
      document.head.appendChild(style);
    }

    var rules = [];

    // 1. 我的云盘
    if (config.hideCloudDrive) {
      // 侧边栏
      rules.push('.side-navigation .side-section a[href*="/CloudDrive"] { display: none !important; }');
      rules.push('.side-navigation .side-link[title*="我的云盘"] { display: none !important; }');
      // 音乐库卡片
      rules.push('.library-page .music-grid .music-card:has(a[href*="/CloudDrive"]) { display: none !important; }');
      rules.push('.library-page .music-card[data-moekoe-type="cloud-drive"] { display: none !important; }');
    }

    // 2. 本地音乐
    if (config.hideLocalMusic) {
      // 侧边栏
      rules.push('.side-navigation .side-section a[href*="/LocalMusic"] { display: none !important; }');
      rules.push('.side-navigation .side-link[title*="本地音乐"] { display: none !important; }');
      // 音乐库卡片
      rules.push('.library-page .music-grid .music-card:has(a[href*="/LocalMusic"]) { display: none !important; }');
      rules.push('.library-page .music-card[data-moekoe-type="local-music"] { display: none !important; }');
    }

    // 3. 我喜欢 歌单
    if (config.hideMyFavorites) {
      // 侧边栏
      rules.push('.side-playlist-list .side-playlist-link[title="我喜欢"] { display: none !important; }');
      rules.push('.side-playlist-list .side-playlist-link[data-moekoe-playlist="我喜欢"] { display: none !important; }');
      // 音乐库歌单卡片
      rules.push('.library-page .music-grid .music-card[data-moekoe-playlist="我喜欢"] { display: none !important; }');
    }

    // 4. 默认收藏 歌单
    if (config.hideDefaultCollect) {
      rules.push('.side-playlist-list .side-playlist-link[title="默认收藏"] { display: none !important; }');
      rules.push('.side-playlist-list .side-playlist-link[data-moekoe-playlist="默认收藏"] { display: none !important; }');
      // 音乐库歌单卡片
      rules.push('.library-page .music-grid .music-card[data-moekoe-playlist="默认收藏"] { display: none !important; }');
    }

    // 5. 音乐库「我喜欢听」历史区域
    if (config.hideListenSection) {
      rules.push('.library-page .favorite-header, .library-page .favorite-section { display: none !important; }');
    }

    style.textContent = rules.join('\n');
  }

  // =============================================
  //  2. 扫描并标记 DOM 元素
  // =============================================
  function scanAndTagElements() {
    // 扫描音乐库卡片
    var musicCards = document.querySelectorAll('.library-page .music-grid .music-card');
    musicCards.forEach(function (card) {
      var h3 = card.querySelector('h3');
      var titleText = h3 ? h3.textContent.trim() : '';

      if (titleText === '我的云盘' || card.querySelector('a[href*="/CloudDrive"]')) {
        card.setAttribute('data-moekoe-type', 'cloud-drive');
      } else if (titleText === '本地音乐' || card.querySelector('a[href*="/LocalMusic"]')) {
        card.setAttribute('data-moekoe-type', 'local-music');
      } else if (titleText === '我喜欢') {
        card.setAttribute('data-moekoe-playlist', '我喜欢');
      } else if (titleText === '默认收藏') {
        card.setAttribute('data-moekoe-playlist', '默认收藏');
      }
    });

    // 扫描侧边栏歌单列表
    var playlistLinks = document.querySelectorAll('.side-playlist-list .side-playlist-link');
    playlistLinks.forEach(function (link) {
      var title = link.getAttribute('title') || '';
      var spanText = (link.querySelector('span') && link.querySelector('span').textContent) || '';
      var name = title.trim() || spanText.trim();

      if (name === '我喜欢') {
        link.setAttribute('data-moekoe-playlist', '我喜欢');
      } else if (name === '默认收藏') {
        link.setAttribute('data-moekoe-playlist', '默认收藏');
      }
    });
  }

  // =============================================
  //  3. 观察 DOM 变动与路由变化
  // =============================================
  function setupObserver() {
    var observer = new MutationObserver(function () {
      scanAndTagElements();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.addEventListener('hashchange', function () {
      setTimeout(scanAndTagElements, 50);
      setTimeout(scanAndTagElements, 300);
    });
  }

  // =============================================
  //  4. 悬浮配置入口与设置弹窗（天空蓝风格）
  // =============================================
  function createUI() {
    if (document.querySelector('.moekoe-hide-playlist-trigger')) return;

    // 悬浮按钮
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

        <label class="moekoe-option-item" for="opt-listen-sec">
          <div class="moekoe-option-label">
            <span>隐藏音乐库「我喜欢听」</span>
            <span class="moekoe-option-desc">隐藏音乐库页面顶部的听歌历史推荐栏</span>
          </div>
          <div class="moekoe-switch">
            <input type="checkbox" id="opt-listen-sec" ${config.hideListenSection ? 'checked' : ''}>
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

    // 绑定事件
    function bindCheckbox(id, key) {
      var input = modal.querySelector('#' + id);
      if (input) {
        input.addEventListener('change', function () {
          config[key] = input.checked;
          saveConfig(config);
          applyDynamicStyle();
          scanAndTagElements();
        });
      }
    }

    bindCheckbox('opt-cloud', 'hideCloudDrive');
    bindCheckbox('opt-local', 'hideLocalMusic');
    bindCheckbox('opt-fav', 'hideMyFavorites');
    bindCheckbox('opt-default-collect', 'hideDefaultCollect');
    bindCheckbox('opt-listen-sec', 'hideListenSection');

    function closeModal() {
      overlay.remove();
    }

    modal.querySelector('#moekoe-modal-close-btn').addEventListener('click', closeModal);
    modal.querySelector('#moekoe-modal-done-btn').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        closeModal();
      }
    });
  }

  // =============================================
  //  5. 初始化执行
  // =============================================
  applyDynamicStyle();
  scanAndTagElements();
  setupObserver();
  createUI();

  console.log('[MoeKoe Hide Default Playlists Hook] 挂载成功！');
})();
