# 技术方案（Technical）

## 总体方案
纯前端静态网页应用（PWA），无框架、无构建工具、无 npm 依赖，打开即用，可「添加到主屏幕」。

## 技术栈
- **HTML**：单页结构，4 个 Tab 视图（今日/探索/统计/设置）。
- **CSS**：全部样式与动画，霓虹粉紫主题，响应式适配手机。
- **JavaScript（vanilla）**：全部逻辑与数据存取，无第三方库。
- **localStorage**：数据本地持久化。
- **PWA**：manifest.json（应用名/图标/主题色）+ service worker（离线缓存）。

## 数据存储
- 所有数据存于 localStorage，key 为 `neon_self_discipline_v1`。
- 结构见 [data-model.md](data-model.md)。
- 跨天逻辑：每次打开页面时用「当前日期」判断是否新的一天，据此重置当日清单视图。

## 部署
- 免费静态托管：GitHub Pages（首选，也可 Netlify/Vercel）。
- 需要 https 才能启用 PWA「添加到主屏幕」与 service worker。

## 本地开发与验证
```bash
cd "/Users/ninayin/Visual Studio/Explore"
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```
- 每次改动刷新即可查看。
- 用「开发者工具 → Application → Local Storage」查看/清空数据以测试。

## 关键实现要点
- 日期用本地时区字符串 `YYYY-MM-DD`（避免 UTC 偏移导致跨天错误）。
- 时间背景按时段映射到 CSS class（如 `.bg--morning` / `.bg--day` / `.bg--dusk` / `.bg--night`）。
- 所有交互无刷新，通过重新渲染视图更新 UI。
