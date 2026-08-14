# MoeKoe Music 隐藏默认歌单插件开发与使用指南

本文档全面梳理了 **MoeKoe Music** 软件内部音乐库及侧边栏默认歌单与快捷入口的生成逻辑，并详细记录了新插件 **`moekoe-hide-default-playlists`** 的设计方案、源码实现与安装使用方法。

---

## 一、 项目分析与默认歌单机制

**基于 **Vue 3 + Vite + Electron + Pinia + Vue Router** 构建的桌面流媒体音乐播放器，兼容 Chrome Extension Manifest V3 扩展规范。

### 1. 默认入口与歌单产生位置

在客户端内，「我的云盘」、「本地音乐」、「我喜欢」、「默认收藏」等内容通过以下逻辑渲染：

| 项目 | 渲染位置 | 实现逻辑与关键代码 |
| :--- | :--- | :--- |
| **我的云盘** | • 侧边栏<br>• 音乐库卡片 | 1. 侧边栏：`SidebarNavigation.vue` 中固定挂载 `<router-link to="/CloudDrive">`。<br>2. 音乐库：`Library.vue` 歌单网格头部固定插入云盘卡片。 |
| **本地音乐** | • 侧边栏<br>• 音乐库卡片 | 1. 侧边栏：`SidebarNavigation.vue` 中固定挂载 `<router-link to="/LocalMusic">`。<br>2. 音乐库：`Library.vue` 歌单网格头部固定插入本地音乐卡片。 |
| **我喜欢** | • 侧边栏列表<br>• 音乐库网格 | 用户登录后请求 `/user/playlist` 接口，前端代码强制将名称等于 `'我喜欢'` 的歌单排序到第一位 (`sort((a, b) => a.name === '我喜欢' ? -1 : 1)`)。 |
| **默认收藏** | • 侧边栏列表<br>• 音乐库网格 | 酷狗/云端服务默认为新注册用户创建的默认收藏夹（部分用户显示为「默认收藏」或「默认歌单」），接口返回后动态渲染。 |
| **我喜欢听** | • 音乐库顶部 | `Library.vue` 顶部的听歌历史卡片栏。 |

---

## 二、 插件设计架构与实现

采用 **主世界 Hook 注入 + 动态 CSS 拦截 + MutationObserver + Vue Hash 路由监听** 技术，兼顾了即时生效与无闪烁体验。

### 1. 核心设计亮点
1. **零闪烁（Zero Flicker）**：通过动态注入带 `!important` 的 CSS 规则，元素在构建及路由切换时直接隐藏，无需等待脚本异步处理。
2. **天空蓝视觉风格**：插件弹窗和操作控件全面升级为 MoeKoe 主题风格的天空蓝（`#38bdf8` / `#0ea5e9`），呈现高端精致的视觉交互。
3. **可视化设置面板**：右下角悬浮眼睛图标，点击弹出设置模态窗口，支持独立勾选：
   - 隐藏「我的云盘」
   - 隐藏「本地音乐」
   - 隐藏「我喜欢」歌单
   - 隐藏「默认收藏」歌单
   - 隐藏「我喜欢听」区域
4. **即时持久化**：配置保存于 `localStorage`，选项切换立即生效，无需重启客户端。

---

## 三、 插件目录与完整源码

插件目录位于：`plugins/extensions/moekoe-hide-default-playlists/`

```
moekoe-hide-default-playlists/
├── manifest.json   # 插件配置清单 (MV3)
├── content.js      # 内容脚本与基础样式注入
├── hook.js         # 主世界脚本与设置弹窗逻辑
└── README.md       # 插件说明文档
```

### 1. `manifest.json`
```json
{
  "manifest_version": 3,
  "plugin_id": "moekoe-hide-default-playlists",
  "name": "MoeKoe 隐藏默认歌单",
  "version": "1.0.0",
  "description": "智能隐藏音乐库与侧边栏中的默认歌单及入口（我的云盘、本地音乐、我喜欢、默认收藏等），并提供实时配置菜单。",
  "author": "Jeffern",
  "minversion": null,
  "moekoe": true,
  "permissions": [],
  "host_permissions": ["<all_urls>", "file:///*"],
  "content_scripts": [
    {
      "matches": ["<all_urls>", "file:///*"],
      "js": ["content.js"],
      "run_at": "document_end",
      "all_frames": false
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["hook.js"],
      "matches": ["<all_urls>", "file:///*"]
    }
  ]
}
```

### 2. `content.js`
```javascript
// == MoeKoe Hide Default Playlists - Content Script ==
(function () {
  'use strict';

  if (document.documentElement.dataset.moekoeHideDefaultPlaylistsReady) return;
  console.log('[MoeKoe Hide Default Playlists] 插件已加载');

  // =============================================
  //  1. 注入 hook.js（主世界脚本）
  // =============================================
  function injectHook() {
    try {
      var hookUrl = chrome.runtime.getURL('hook.js');
      var script = document.createElement('script');
      script.src = hookUrl;
      script.onload = function () {
        console.log('[MoeKoe Hide Default Playlists] hook.js 已加载');
        document.documentElement.dataset.moekoeHideDefaultPlaylistsReady = '1';
      };
      script.onerror = function () {
        console.error('[MoeKoe Hide Default Playlists] hook.js 加载失败:', hookUrl);
      };
      document.documentElement.appendChild(script);
    } catch (e) {
      console.error('[MoeKoe Hide Default Playlists] Hook 注入失败:', e);
    }
  }

  // =============================================
  //  2. 注入全局基础样式（浮动配置按钮与弹窗，主色调：天空蓝）
  // =============================================
  function injectStyle() {
    if (document.querySelector('#moekoe-hide-playlists-style')) return;
    var style = document.createElement('style');
    style.id = 'moekoe-hide-playlists-style';
    style.textContent = `
      /* 隐藏标记类 */
      .moekoe-hidden-item {
        display: none !important;
      }

      /* 悬浮配置触发按钮 */
      .moekoe-hide-playlist-trigger {
        position: fixed;
        bottom: 85px;
        right: 20px;
        z-index: 99998;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(26, 30, 36, 0.88);
        border: 1px solid rgba(56, 189, 248, 0.3);
        color: #e0f2fe;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 15px;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(10px);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        user-select: none;
      }
      .moekoe-hide-playlist-trigger:hover {
        background: rgba(30, 41, 59, 0.95);
        color: #38bdf8;
        transform: scale(1.08);
        border-color: #38bdf8;
        box-shadow: 0 0 14px rgba(56, 189, 248, 0.4);
      }

      /* 配置弹窗蒙层与面板 */
      .moekoe-hide-playlist-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(6px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: moekoeFadeIn 0.2s ease;
      }

      .moekoe-hide-playlist-modal {
        background: #181c22;
        border: 1px solid rgba(56, 189, 248, 0.2);
        border-radius: 14px;
        width: 360px;
        max-width: 90vw;
        padding: 20px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(56, 189, 248, 0.08);
        color: #e2e8f0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        animation: moekoeScaleUp 0.2s ease;
      }

      .moekoe-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .moekoe-modal-title {
        font-size: 16px;
        font-weight: 600;
        color: #f0f9ff;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .moekoe-modal-close {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 18px;
        padding: 4px;
        line-height: 1;
        transition: color 0.15s;
      }
      .moekoe-modal-close:hover {
        color: #38bdf8;
      }

      .moekoe-modal-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 18px;
      }
      .moekoe-option-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 12px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid transparent;
        transition: all 0.15s ease;
        cursor: pointer;
      }
      .moekoe-option-item:hover {
        background: rgba(56, 189, 248, 0.06);
        border-color: rgba(56, 189, 248, 0.15);
      }
      .moekoe-option-label {
        font-size: 13.5px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .moekoe-option-desc {
        font-size: 11px;
        color: #94a3b8;
      }

      /* 自定义 Toggle Switch（天空蓝） */
      .moekoe-switch {
        position: relative;
        display: inline-block;
        width: 38px;
        height: 22px;
        flex-shrink: 0;
      }
      .moekoe-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .moekoe-slider {
        position: absolute;
        cursor: pointer;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: #334155;
        transition: .25s ease;
        border-radius: 22px;
      }
      .moekoe-slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 3px;
        bottom: 3px;
        background-color: #ffffff;
        transition: .25s ease;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }
      .moekoe-switch input:checked + .moekoe-slider {
        background-color: #38bdf8;
      }
      .moekoe-switch input:checked + .moekoe-slider:before {
        transform: translateX(16px);
      }

      .moekoe-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      .moekoe-btn {
        padding: 7px 18px;
        font-size: 13px;
        font-weight: 500;
        border-radius: 7px;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      /* 天空蓝主按钮 */
      .moekoe-btn-primary {
        background: #38bdf8;
        color: #0f172a;
        box-shadow: 0 2px 10px rgba(56, 189, 248, 0.3);
      }
      .moekoe-btn-primary:hover {
        background: #0ea5e9;
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(14, 165, 233, 0.45);
      }

      @keyframes moekoeFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes moekoeScaleUp {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  // =============================================
  //  3. 初始化
  // =============================================
  injectStyle();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectHook);
  } else {
    injectHook();
  }
})();
```

### 3. `hook.js`
```javascript
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
      rules.push('.side-navigation .side-section a[href*="/CloudDrive"] { display: none !important; }');
      rules.push('.side-navigation .side-link[title*="我的云盘"] { display: none !important; }');
      rules.push('.library-page .music-grid .music-card:has(a[href*="/CloudDrive"]) { display: none !important; }');
      rules.push('.library-page .music-card[data-moekoe-type="cloud-drive"] { display: none !important; }');
    }

    // 2. 本地音乐
    if (config.hideLocalMusic) {
      rules.push('.side-navigation .side-section a[href*="/LocalMusic"] { display: none !important; }');
      rules.push('.side-navigation .side-link[title*="本地音乐"] { display: none !important; }');
      rules.push('.library-page .music-grid .music-card:has(a[href*="/LocalMusic"]) { display: none !important; }');
      rules.push('.library-page .music-card[data-moekoe-type="local-music"] { display: none !important; }');
    }

    // 3. 我喜欢 歌单
    if (config.hideMyFavorites) {
      rules.push('.side-playlist-list .side-playlist-link[title="我喜欢"] { display: none !important; }');
      rules.push('.side-playlist-list .side-playlist-link[data-moekoe-playlist="我喜欢"] { display: none !important; }');
      rules.push('.library-page .music-grid .music-card[data-moekoe-playlist="我喜欢"] { display: none !important; }');
    }

    // 4. 默认收藏 歌单
    if (config.hideDefaultCollect) {
      rules.push('.side-playlist-list .side-playlist-link[title="默认收藏"] { display: none !important; }');
      rules.push('.side-playlist-list .side-playlist-link[data-moekoe-playlist="默认收藏"] { display: none !important; }');
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
```

---

## 四、 安装与运行验证

1. **自动加载方式**：
   - 插件位于项目的 [`plugins/extensions/moekoe-hide-default-playlists/`](file:///Users/jeffern/Downloads/MoeKoeMusic-main/plugins/extensions/moekoe-hide-default-playlists/) 目录下。
   - 启动或重启 MoeKoe Music 客户端，Electron 扩展管理器将自动加载此插件。

2. **客户端内手动管理**：
   - 打开客户端，进入 **设置** -> **扩展管理**。
   - 点击 **刷新插件** 即可在已安装列表中看到 **MoeKoe 隐藏默认歌单**。

3. **可视化配置调节**：
   - 界面右下角悬浮了**眼睛过滤图标**（天空蓝高亮与微光交互）。
   - 点击即可随时调出设置弹窗，自定义开关任意默认歌单的隐藏项。
