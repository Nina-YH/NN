# 霓虹自律 — 项目工作手册

## 项目简介
一个跑在 iPhone 17 Pro Max 上的自律网页应用（PWA）。核心功能：睡眠记录、按时刻切换背景、
每日待办清单、打卡统计、爱好/习惯探索模块、数据备份。风格：赛博黑客风 · 偏女性向 · 霓虹粉紫。

## 标准文件索引（每次开工必读）
| 文件 | 作用 |
|------|------|
| [docs/requirements.md](docs/requirements.md) | 开发需求与验收标准 |
| [docs/technical.md](docs/technical.md) | 技术方案 |
| [docs/design.md](docs/design.md) | 设计规范（配色/字体/质感/背景） |
| [docs/roadmap.md](docs/roadmap.md) | 阶段路线图与每阶段验收标准 |
| [docs/data-model.md](docs/data-model.md) | localStorage 数据模型 |
| [DEV_LOG.md](DEV_LOG.md) | 开发日志（每日完成/待办） |

## 工作流程（每次会话）
1. **开工**：读本文件 + docs/ 各标准文件 + DEV_LOG.md，明确当前阶段与待办。
2. **开发**：按 docs/roadmap.md 只做当前阶段，不擅自扩大范围或提前做后续阶段。
3. **验证**：本地 `python3 -m http.server` 起服务，浏览器逐项验证本阶段验收标准。
4. **收工**：更新 DEV_LOG.md，记录「完成」与「待办」，再停止。

## 增量开发原则
- 一次只做一个阶段；本阶段完成并验证通过后，才能进入下一阶段。
- 每完成一个阶段，在 DEV_LOG.md 记录完成并列出下一阶段待办。
- 改动若涉及数据模型或设计规范，先同步更新对应 docs 文件。

## 环境约束
- 纯前端：HTML/CSS/JS，无框架、无构建工具、无 npm。
- 数据存浏览器 localStorage；部署用免费静态托管（GitHub Pages 等）。
