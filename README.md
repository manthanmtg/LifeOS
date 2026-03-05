# 🧠 Life OS

A high-fidelity, open-source template framework that acts as a **"Shell"** — dynamically rendering a professional portfolio and a private life-management dashboard.

Built with **Next.js 16**, **Tailwind CSS v4**, **MongoDB**, and **Framer Motion**.

---

## ✨ Features

- **Modular Architecture** — Add or remove "micro-app" modules without affecting the core shell
- **Polymorphic Data Layer** — All module data in a single MongoDB collection, validated by Zod per type
- **JWT Authentication** — Password-based admin login with HTTP-only cookies
- **Dynamic Routing** — `app/admin/[module]` catch-all renders any registered module's AdminView
- **Theme Engine** — Multiple developer themes (One Dark, Dracula, Cyberpunk, etc.)
- **Command Palette** — `Ctrl+K` global search and quick actions
- **Data Portability** — Full JSON export/import for backup and migration

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS v4, Framer Motion |
| Database | MongoDB Atlas |
| Validation | Zod v4 |
| Auth | jose (edge-compatible JWT) |
| Package Manager | pnpm |

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** — Install via `npm install -g pnpm`
- **MongoDB Atlas** free cluster ([create one here](https://www.mongodb.com/cloud/atlas/register))

### 1. Clone the repository

```bash
git clone https://github.com/your-username/LifeOS.git
cd LifeOS
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```env
# MongoDB connection string (replace with your Atlas URI)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/lifeos?retryWrites=true&w=majority

# Admin login password (choose your own)
ADMIN_PASSWORD=YourSecurePassword123

# JWT signing secret (use a random string)
JWT_SECRET=some-long-random-secret-string
```

### 4. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Access the Admin Portal

1. Navigate to [http://localhost:3000/login](http://localhost:3000/login)
2. Enter your `ADMIN_PASSWORD`
3. You'll be redirected to the **Command Center** at `/admin`

> On first run, the database is automatically seeded with default system configuration.

---

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, metadata, DB seed)
│   ├── page.tsx                  # Public landing page
│   ├── login/page.tsx            # Admin login
│   ├── admin/
│   │   ├── layout.tsx            # Admin shell (sidebar + content)
│   │   ├── page.tsx              # Dashboard (widget grid)
│   │   └── [module]/page.tsx     # Dynamic module routing
│   └── api/
│       ├── auth/login/route.ts   # POST: password → JWT cookie
│       ├── content/route.ts      # GET/POST: polymorphic content
│       ├── content/[id]/route.ts # GET/PUT/DELETE: single item
│       └── system/route.ts       # GET/PUT: global config
├── lib/
│   ├── mongodb.ts                # Cached MongoClient singleton
│   ├── auth.ts                   # JWT sign/verify (jose)
│   ├── schemas.ts                # Zod schema registry
│   ├── seed.ts                   # First-run DB initializer
│   ├── types.ts                  # TypeScript interfaces
│   └── utils.ts                  # cn() utility
├── modules/
│   └── _template/                # Copy-paste skeleton for new modules
│       └── AdminView.tsx
├── components/
│   └── shell/
│       └── AdminSidebar.tsx      # Registry-driven sidebar nav
├── registry.ts                   # Module slug → config mapping
└── proxy.ts                      # Auth guard (Next.js 16 proxy)
```

---

## 🔌 Adding a New Module

1. Create `src/modules/your-module/AdminView.tsx`
2. Add a Zod schema to `src/lib/schemas.ts` and register it in `SchemaRegistry`
3. Register the module in `src/registry.ts`:
   ```ts
   your_module: { name: "Your Module", icon: "Star", defaultPublic: false }
   ```
4. Data automatically saves to the `content` collection under `module_type: "your_module"` — **zero database setup**.

---

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server (Turbopack) |
| `pnpm build` | Create production build |
| `pnpm start` | Run production server |
| `pnpm lint` | Run ESLint |

---

## 📄 License

This project is licensed under the terms in the [LICENSE](./LICENSE) file.
