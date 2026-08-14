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
