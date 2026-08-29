# DBLab — Database Learning Lab

<div align="center">

![DBLab Logo](public/logo.svg)

### Interactive, Local-First Database Learning Platform

A modern, local-first **React Progressive Web App (PWA)** built for undergraduate and professional database education. Design ERDs visually, compile schemas to client-side SQLite WASM in real-time, query with intelligent Monaco editor tooling, and participate in structured, step-by-step assignment labs.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![SQLite WASM](https://img.shields.io/badge/SQLite-WASM%20(sql.js)-003B57?logo=sqlite&logoColor=white)](https://sql.js.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Spark%20Free%20Tier-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

</div>

---

## 🌟 Key Features

### 1. 🎨 Visual ERD Designer
- **Interactive Canvas**: Drag-and-drop table modeling powered by `@xyflow/react` (React Flow).
- **Relational Integrity**: Visual foreign key links (1:1, 1:N, N:M), cascade actions, composite primary keys, and column constraints (`NOT NULL`, `UNIQUE`, `DEFAULT`, `CHECK`).
- **One-Click DDL Generation**: Automatically translates visual schemas into clean, standardized SQLite DDL queries with syntax highlighting and dependency ordering.

### 2. ⚡ In-Browser SQLite WASM Studio
- **100% Local Execution**: Runs real SQLite inside your browser via WebAssembly (`sql.js`). No external database servers or backend containers required.
- **Monaco SQL Editor**: Full VS Code-grade code editing with syntax highlighting, keyboard shortcuts, formatting, and live database schema autocompletion (tables, columns, SQL keywords).
- **Rich Result Viewer & Visual Data Grid**: Inspect result sets, execution times, query plans, and manipulate table data directly via visual forms (Insert, Update, Delete).
- **Export & Import**: Export raw `.sqlite` binaries, DDL scripts, or tabular data in CSV and JSON formats.

### 3. 🎓 Interactive Assignment & Course Labs (Qwiklabs-style)
- **Guided Tasks**: Step-by-step instructions with contextual hints, prerequisites, estimated time, and documentation links.
- **Instant Query Validation**: Validate student SQL solutions against real database state with automated assertions.
- **Student Progress & Notes**: Students can keep persistent notes per task and track progress across courses.
- **Lecturer Review Workflow**: Dedicated review drawer for lecturers to inspect student code submissions, evaluate execution outcomes, and submit grading with structured feedback.

### 4. ☁️ Zero-Cost Cloud Sync (Firebase Spark Plan)
- **Strict Free-Tier Architecture**: Built exclusively on Firebase Auth, Firestore, and Hosting. Zero Cloud Functions, zero Cloud Storage.
- **Smart Chunking for SQLite Binaries**: Large `.sqlite` database files (>1 MiB) are chunked into 450 KiB Firestore documents with gzip compression and SHA-256 integrity verification.
- **Role-Based Access Control**: Server-enforced security rules separating `student` and `lecturer` permissions.

### 5. 📱 Installable PWA & Offline Support
- Fully installable on Desktop (macOS, Windows, Linux) and Mobile (Android, iOS).
- Offline app shell and Monaco/WASM pre-caching via Workbox Service Workers.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Core Framework** | [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) (Strict Mode), [Vite 5](https://vitejs.dev/) |
| **UI Kit & Styling** | [Ant Design 5](https://ant.design/), [Lucide React](https://lucide.dev/), Custom Dark/Light Theme System |
| **ERD Canvas** | [@xyflow/react](https://reactflow.dev/) (React Flow) |
| **Editor & Runtime** | [Monaco Editor](https://microsoft.github.io/monaco-editor/), [sql.js](https://sql.js.org/) (SQLite WASM) |
| **State & Validation** | [Zustand](https://github.com/pmndrs/zustand) (with undo/redo & persistence), [Zod](https://zod.dev/) |
| **Cloud & Backend** | [Firebase 10](https://firebase.google.com/) (Auth, Cloud Firestore, Hosting) |
| **PWA & Offline** | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/), Workbox |
| **Quality & Tests** | [Vitest](https://vitest.dev/), React Testing Library, [Playwright](https://playwright.dev/), ESLint 9 |

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) $\ge$ 20.x
- [npm](https://www.npmjs.com/) $\ge$ 10.x

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/anggun-indra/db-labs.git
   cd db-labs
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

> [!NOTE]
> **DBLab runs 100% locally out-of-the-box!** You can use the ERD designer, generate SQLite databases, and execute SQL queries without configuring Firebase.

---

## ⚙️ Optional Firebase Configuration

To enable user authentication, cloud project synchronization, and assignment submission:

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in your Firebase web app configuration values:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Vite development server with HMR |
| `npm run build` | Runs TypeScript typecheck and bundles production build with PWA assets |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs ESLint with zero-warning enforcement |
| `npm run typecheck` | Validates TypeScript types across the codebase |
| `npm run test` | Runs unit and integration test suite via Vitest |
| `npm run test:e2e` | Executes Playwright end-to-end browser tests |
| `npm run test:rules` | Runs Firestore security rules tests against Firebase Emulator |
| `npm run gates` | Runs full quality gate checklist (lint + typecheck + unit + e2e) |
| `npm run icons` | Generates PWA icon assets from source vector logo |

---

## 📂 Project Architecture

```text
db-labs/
├── e2e/                     # Playwright end-to-end test scenarios
├── public/                  # Static assets, WASM binaries, PWA manifest & icons
├── scripts/                 # Utility scripts (seeders, quality gates, icon generator)
├── src/
│   ├── app/                 # Root router, shell layout, and PWA setup
│   ├── components/          # Shared reusable UI components
│   ├── features/
│   │   ├── admin/           # Admin & role management
│   │   ├── assignments/     # Task-driven assignment labs & validation
│   │   ├── courses/         # Course listing, creation, and detail views
│   │   ├── dashboard/       # Main learning hub & recent activity
│   │   ├── database/        # Database explorer & schema viewer
│   │   ├── erd/             # Visual ERD designer canvas & table inspector
│   │   ├── playground/      # Monaco SQL editor, result tables & visual grid
│   │   ├── profile/         # User profile & credentials management
│   │   ├── projects/        # Project persistence & project management
│   │   ├── settings/        # System preferences & theme customization
│   │   ├── snapshots/       # SQLite binary snapshot chunking & restoration
│   │   └── submissions/     # Lecturer review drawer & student submissions
│   ├── lib/
│   │   ├── firebase/        # Firebase Auth & Firestore adapters with offline fallbacks
│   │   ├── monaco/          # Monaco SQL autocompletion & schema tokenizers
│   │   └── sqlite/          # sql.js WASM runtime & query execution engine
│   ├── stores/              # Zustand global state stores (auth, ERD, playground, etc.)
│   └── styles/              # Global CSS & design system tokens
└── firestore.rules          # Production security rules enforcing RBAC
```

---

## 📖 In-Depth Documentation

For architectural deep-dives and operational guides, explore our documentation:

- 📐 [**Architecture Guide**](./ARCHITECTURE.md) — System layers, reactive state, and decoupling models.
- 🗄️ [**ERD Schema Domain Model**](./ERD-SCHEMA.md) — Zod-validated domain specifications.
- ⚡ [**SQLite WASM Runtime**](./SQLITE.md) — In-browser SQL execution architecture.
- 🔥 [**Firebase & Spark Constraints**](./FIREBASE.md) — Serverless zero-cost design.
- 🔒 [**Security Model**](./SECURITY.md) — Threat model and Firestore rule design.
- 🧪 [**Testing Strategy**](./TESTING.md) — Vitest, RTL, and Playwright test pyramid.
- 🚀 [**Deployment Guide**](./DEPLOYMENT.md) — Production release procedures.
- 🎓 [**Classroom Guide**](./CLASSROOM-GUIDE.md) — Guide for educators and teaching assistants.

---

## 🤝 Contributing

Contributions are welcome! Please ensure all code passes our quality gates before submitting a pull request:

```bash
npm run gates:quick
```

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
