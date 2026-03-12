# 🧠 Life OS

**Your personal command center for life — portfolio, productivity, health & finance.**

[![Stars](https://img.shields.io/github/stars/manthanmtg/LifeOS?style=flat&color=ffd700)](https://github.com/manthanmtg/LifeOS/stargazers)
[![Forks](https://img.shields.io/github/forks/manthanmtg/LifeOS?style=flat&color=4ade80)](https://github.com/manthanmtg/LifeOS/network)
[![License](https://img.shields.io/github/license/manthanmtg/LifeOS?style=flat&color=60a5fa)](https://github.com/manthanmtg/LifeOS/blob/main/LICENSE)
[![Next.js](https://img.shields.io/badge/Built_with-Next.js_16-black?style=flat&color=000000)](https://vercel.com)
[![Discord](https://img.shields.io/badge/Join_Community-4ade80?style=flat)](https://discord.gg)

---

## ✨ Why Life OS?

> **One app. Infinite possibilities.** Your public portfolio, private dashboard, and life operating system — all in one beautiful, self-hosted package.

- **Public Portfolio** — Professional presence that showcases your work, blog, and skills
- **Private Command Center** — 18 powerful modules for tasks, habits, finance, health & more
- **100% You** — Full ownership. Your data. Your rules. Self-host anywhere
- **AI-Powered** — Track AI usage, costs, and integrate intelligent automation

---

## 🚀 Features

### 💡 Ideas & Tasks

- **Ideas** — Kanban-style idea board. 5 stages: Raw → Exploring → Building → Launched → Archived. Promote winning ideas to your portfolio!
- **Compass** — Prioritized task management with P1-P5 levels. Workspace organization for focused execution.
- **Todo** — Clean, distraction-free task list with custom UI and quick actions.

### ❤️ Health & Habits

- **Habit Tracker** — GitHub-style heatmap calendar. Track streaks, color-coded days, daily logging with visual progress.
- **Reading Queue** — URL-based queue with priority levels, type filters (article/video/book), read/unread tracking.
- **Bookshelf** — Personal library with progress bars, star ratings, reading status, and notes.

### 💰 Finance

- **Expenses** — Daily spending ledger with category tags, smart suggestions, and visual analytics.
- **Subscriptions** — Track recurring costs, renewal countdowns, monthly burn rate calculation.
- **EMI Tracker** — Loan management with cost distribution charts and payment schedules.

### 🎯 Goals & Metrics

- **Analytics** — Self-hosted page views, device breakdown, top pages, referrers — no third-party scripts!
- **AI Usage** — Track token counts across AI providers, monitor costs, optimize spending.
- **Crop History** — Agricultural tracking with formulas, area-based analytics for the farming-minded.

### 📦 Productivity & More

- **Blog** — Markdown editor with dual-pane preview, draft/publish/archive workflow, SEO-friendly.
- **Portfolio** — Hero section, bio, skills, social links, "Available for hire" badge.
- **Snippets** — Code library with one-click copy, syntax highlighting, favorites.
- **Calculators** — Custom math tools with saved calculations.
- **Shopping List** — Inventory management with category filters.
- **Rain Tracker** — Precipitation logging with area-wise distribution.

---

## 🖥️ Screenshots

| Admin Dashboard | Portfolio |
|:---:|:---:|
| ![Admin Dashboard](https://placehold.co/600x400/1a1a2e/FFF?text=Admin+Dashboard) | ![Portfolio](https://placehold.co/600x400/1a1a2e/FFF?text=Portfolio) |

| Ideas Board | Habit Tracker |
|:---:|:---:|
| ![Ideas](https://placehold.co/600x400/1a1a2e/FFF?text=Ideas+Board) | ![Habits](https://placehold.co/600x400/1a1a2e/FFF?text=Habit+Tracker) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Styling** | Tailwind CSS v4, Framer Motion |
| **Database** | MongoDB Atlas (polymorphic single collection) |
| **Validation** | Zod v4 |
| **Auth** | jose (edge-compatible JWT) |
| **Deployment** | Vercel, Netlify, or any Node.js host |

```
┌─────────────────────────────────────────────────────────────┐
│                     Life OS Architecture                     │
├─────────────────────────────────────────────────────────────┤
│  Client (Next.js)                                           │
│  ├── Public Portfolio / Blog                                │
│  ├── Admin Dashboard (Bento Grid)                           │
│  └── 18 Modular AdminViews                                  │
├─────────────────────────────────────────────────────────────┤
│  API Layer                                                  │
│  ├── /api/content — Polymorphic CRUD                       │
│  ├── /api/auth/login — JWT Authentication                   │
│  ├── /api/system — Global config                            │
│  ├── /api/metrics — Self-hosted analytics                  │
│  └── /api/export / import — Data portability               │
├─────────────────────────────────────────────────────────────┤
│  Database (MongoDB)                                        │
│  ├── system (config)                                        │
│  ├── content (polymorphic: module_type + payload)          │
│  └── metrics (analytics events)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏃‍♂️ Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** — `npm install -g pnpm`
- **MongoDB Atlas** — [Free cluster](https://www.mongodb.com/cloud/atlas/register)

### 1. Clone & Install

```bash
git clone https://github.com/manthanmtg/LifeOS.git
cd LifeOS
pnpm install
```

### 2. Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/lifeos?retryWrites=true&w=majority
ADMIN_PASSWORD=YourSecurePassword123
JWT_SECRET=some-long-random-secret-string
```

### 3. Run

```bash
pnpm dev
```

- **Public site:** http://localhost:3000
- **Admin login:** http://localhost:3000/login

> 💡 First run auto-seeds the database with default config.

---

## ☁️ Deploy

### Vercel (Recommended)

```bash
npm i -g vercel
vercel
```

Set environment variables in Vercel dashboard.

### Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/manthanmtg/LifeOS)

Set `MONGODB_URI`, `ADMIN_PASSWORD`, `JWT_SECRET` in Netlify dashboard.

### Self-Host (Docker/Railway/Render)

```bash
pnpm build
pnpm start
```

Any Node.js hosting works — just set the environment variables.

---

## 🗺️ Roadmap

- [ ] **Mobile App** — React Native companion for iOS/Android
- [ ] **AI Integration** — Smart suggestions,自动化, GPT-powered insights
- [ ] **Offline Mode** — PWA with local-first data sync
- [ ] **Multi-user Support** — Family/team sharing with role-based access
- [ ] **More Modules** — Budget planner, workout tracker, meal planner
- [ ] **Plugin System** — Third-party module marketplace

---

## 🤝 Contributing

Contributions welcome! Here's how to help:

1. **Fork** the repository
2. Create a feature branch: `git checkout -b feat/awesome-feature`
3. Make your changes and test: `pnpm lint && pnpm build`
4. Commit: `git commit -m 'feat: add awesome feature'`
5. Push: `git push origin feat/awesome-feature`
6. Open a **Pull Request**

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed conventions.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Public portfolio
│   ├── admin/
│   │   ├── page.tsx                # Dashboard (Bento grid)
│   │   ├── settings/               # Theme/export/import
│   │   └── [module]/               # Dynamic module routes
│   └── api/
│       ├── auth/login/             # JWT auth
│       ├── content/                # Polymorphic CRUD
│       ├── system/                 # Global config
│       ├── metrics/                # Analytics
│       └── export/import/          # Backup/restore
├── lib/
│   ├── mongodb.ts                  # MongoDB singleton
│   ├── auth.ts                     # JWT helpers
│   ├── schemas.ts                  # Zod validation
│   ├── seed.ts                     # DB initializer
│   └── utils.ts                    # Utilities
├── modules/                        # 18 modules
│   ├── portfolio/, blog/, expenses/
│   ├── ideas/, compass/, habits/
│   └── ... (see full list below)
├── components/shell/               # Layout components
├── registry.ts                     # Module config
└── proxy.ts                        # Auth middleware
```

---

## 📜 License

MIT License — see [LICENSE](./LICENSE) for details.

---

*Built with ❤️ using Next.js, MongoDB & Tailwind*
