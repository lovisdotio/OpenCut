# OpenCut

OpenCut is a free, open-source video editor built with Next.js, focusing on privacy (no server processing), multi-track timeline editing, and real-time preview. The project is a monorepo using Turborepo with multiple apps including a web application, desktop app (Tauri), background remover tools, and transcription services.

## ✨ Key Features

- **Privacy First:** All video processing is done in the browser. No files are ever uploaded to a server.
- **Multi-Track Timeline:** A powerful, canvas-based timeline for complex editing.
- **Real-Time Preview:** See your changes instantly.
- **AI-Powered Content Fill:** Seamlessly remove and replace objects in your videos with the power of fal.ai's WAN-VACE 14B model.
- **Performance Optimized:** A highly optimized rendering pipeline ensures smooth editing, even with larger files.

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+ recommended)
- **Bun**
- **Docker** and **Docker Compose**

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/opencut.git
    cd opencut
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Set up environment variables:**
    ```bash
    cp apps/web/.env.example apps/web/.env.local
    ```
    Then, edit `apps/web/.env.local` with your database credentials and a `BETTER_AUTH_SECRET`.

4.  **Start local services:**
    ```bash
    docker-compose up -d
    ```

5.  **Run database migrations:**
    ```bash
    cd apps/web
    bun run db:push:local
    cd ../..
    ```

### Running the App

```bash
bun run dev
```

Your app will be available at `http://localhost:3000`.

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (with App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Database:** PostgreSQL with Drizzle ORM
- **Video Processing:** FFmpeg (via `@ffmpeg/ffmpeg`)
- **Monorepo:** Turborepo

## 🧠 Architecture Overview

The project is a monorepo managed by Turborepo, with the main web application located in `apps/web`.

- **`apps/web`:** The main Next.js application.
  - **`src/components/editor`:** Core components for the video editor.
  - **`src/stores`:** Zustand stores for state management (`timeline-store`, `media-store`, etc.).
  - **`src/lib`:** Core logic, including the `content-fill-service.ts` which orchestrates the AI video processing.
- **`packages/`:** Shared packages for authentication and database schemas.

## ⚡ Performance

The application has been heavily optimized for performance:

- **Optimized Video Caching:** Reduces lag and improves playback smoothness.
- **Efficient Frame Caching:** Smart caching of rendered frames to speed up seeking.
- **Intelligent Video Preloading:** Proactively loads video frames around the playhead.
- **Real-time Performance Monitoring:** A built-in debug panel helps track and optimize performance.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## 📄 License

This project is licensed under the MIT License.
