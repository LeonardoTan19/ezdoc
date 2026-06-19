# ezdoc

[![Version](https://img.shields.io/badge/version-v0.1.1-blue)](https://github.com/LeonardoTan19/ezdoc/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/LeonardoTan19/ezdoc/releases)
[![Bun](https://img.shields.io/badge/built%20with-Bun-fbf0df?logo=bun)](https://bun.sh)
[![Tauri](https://img.shields.io/badge/built%20with-Tauri%202-ffc131?logo=tauri)](https://v2.tauri.app/)
[![shadcn/ui](https://img.shields.io/badge/built%20with-shadcn%2Fui-000000?logo=shadcnui)](https://ui.shadcn.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Markdown 排版预览编辑器 — 用 Markdown 写作，选择中文排版标准（如 GB/T 9704），实时预览 A4 纸面效果。

## 技术栈

| 层 | 技术 |
|---|------|
| 桌面框架 | [Tauri 2](https://v2.tauri.app/) (Rust) |
| 前端 | React 19 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS 4 |
| 编辑器 | CodeMirror 6 |
| 状态管理 | Zustand |
| 国际化 | i18next + react-i18next |
| 排版引擎 | 纯 TypeScript（无 UI 依赖） |

## 快速开始

项目使用 **Bun** 作为包管理器。

```bash
# 安装依赖
bun install

# 启动 Vite 开发服务器（端口 1420）
bun run dev

# 启动完整 Tauri 桌面应用（自动启动 Vite）
bun run tauri dev
```

## 命令速查

```bash
bun run dev           # Vite 开发服务器
bun run tauri dev     # Tauri 桌面应用（开发模式）
bun run build         # 类型检查 + 生产构建
bun run typecheck     # 仅类型检查（tsc --noEmit）
bun run tauri build   # 打包桌面应用
bun run lint          # ESLint 检查
bun run format        # Prettier 格式化
bun run release       # 发布脚本（tag 驱动）

# 测试（Vitest + jsdom）
bunx vitest run                           # 运行全部测试
bunx vitest                               # 监听模式
bunx vitest run src/engine/compiler/test  # 单个目录
bunx vitest run -t "test name"            # 按名称过滤
```

## 架构概览

```
┌─────────────────────────────────────────────┐
│  Tauri Shell (src-tauri/)                    │
│  Rust · 窗口管理 · 外部链接拦截              │
├─────────────────────────────────────────────┤
│  React App (src/)                            │
│  ┌───────────┐  ┌──────────┐  ┌──────────┐ │
│  │  Editor   │  │ Preview  │  │ Settings │ │
│  │ CodeMirror│  │ A4 Paper │  │  Panels  │ │
│  └───────────┘  └──────────┘  └──────────┘ │
│        │              │              │        │
│  ┌─────┴──────────────┴──────────────┴─────┐ │
│  │  Hooks · Stores (Zustand) · i18n       │ │
│  └─────────────────┬───────────────────────┘ │
├────────────────────┼─────────────────────────┤
│  Engine (src/engine/)  ·  纯 TS · 无 UI 依赖 │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Compiler │  │  Parser  │  │ Schema/     │ │
│  │ Rule→CSS │  │  MD→HTML │  │ Validation  │ │
│  └──────────┘  └──────────┘  └────────────┘ │
└─────────────────────────────────────────────┘
```

### 排版引擎 (`src/engine/`)

引擎是纯 TypeScript 实现，不依赖任何 UI 层代码。公共 API 从 `src/engine/index.ts` 导出：

- **`compileRule(config, host)`** — 将排版规则编译为 CSS
- **`validateRule(config)`** — 校验规则配置
- **`getBuiltinRules()`** — 获取内置排版规则
- **`MarkdownParser`** — Markdown 解析器（五阶段流水线）
- **`DEFAULT_HOST`** — 默认 DOM 选择器集合

三个子系统：

- **Compiler** — 三阶段流水线：生成 CSS 自定义属性 Token → 构建样式规则 → 序列化为 CSS 文本
- **Parser** — 五阶段流水线：预处理 → markdown-it 解析 → Token 处理 → 渲染 → HTML 后处理
- **Schema & Validation** — Zod 定义 `RuleConfig` 结构，手写校验使用工厂模式

### 内置排版规则

| 规则 | 标准 |
|------|------|
| GB/T 9704-2012 | 党政机关公文格式 |
| GB/T 33476-2016 | 党政机关电子公文格式 |

规则以 YAML 文件存储在 `src/engine/builtin-rules/`，通过 `?raw` 导入并由 schema 层解析。

### Tauri 外壳 (`src-tauri/`)

- 外部链接（http/https/mailto/tel）通过 `tauri-plugin-opener` 在系统浏览器打开
- 主窗口在页面加载完成后显示
- Cargo 包名 `tauri-native`，lib 名 `tauri_native_lib`

## 项目约定

- 路径别名 `@/` → `src/`
- shadcn/ui 组件放在 `src/components/ui/`，图标库为 **hugeicons**
- TypeScript strict 模式，类型导入必须使用 `import type`
- Prettier：无分号、双引号、2 空格缩进、80 列宽、ES5 尾逗号
- 测试文件与源码同目录，放在 `test/` 子目录下
- 发布流程：推送 `v*` tag 触发 GitHub Actions 跨平台构建
- 引擎层禁止导入 `lib/`、`hooks/`、`stores/`、`components/`

## 项目背景

本项目是从 `gov-draft`（Vue 3 + Express）向 Tauri + React 19 迁移的重写版本。排版引擎已完整移植并重构，应用层（编辑器、预览、状态管理）已基本完成。详细设计见 `docs/superpowers/plans/`。

## 许可证

[MIT](LICENSE)
