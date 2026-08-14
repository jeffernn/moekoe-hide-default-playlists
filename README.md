# MoeKoe Music 隐藏默认歌单插件使用指南

---

-- <img width="449" height="503" alt="image" src="https://github.com/user-attachments/assets/e0f3dddf-4d11-495d-bf88-1092639bbcc9" />
-- <img width="968" height="346" alt="image" src="https://github.com/user-attachments/assets/6bd99eb2-8c9f-44da-8c94-0414f0b980fa" />



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
| **创建歌单** | • 侧边栏列表<br>• 音乐库网格 | 隐藏创建歌单 |

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
   - 隐藏「创建歌单」入口
4. **即时持久化**：配置保存于 `localStorage`，选项切换立即生效，无需重启客户端。

---

## 三、 插件目录

插件目录位于：`plugins/extensions/moekoe-hide-default-playlists/`

```
moekoe-hide-default-playlists/
├── manifest.json   # 插件配置清单 (MV3)
├── content.js      # 内容脚本与基础样式注入
├── hook.js         # 主世界脚本与设置弹窗逻辑
└── README.md       # 插件说明文档
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
