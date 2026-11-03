# Clutus - AI Outfit Recommendation & Digital Wardrobe

An AI-driven personal wardrobe system that allows users to upload or capture photos of clothing items, automatically analyzes attributes using OpenAI Vision (`gpt-4o-mini`), supports user verification before saving to Supabase PostgreSQL, and generates coordinated **Top + Bottom + Shoes** outfits for **Casual** or **Office** occasions.

## Architecture & Deployment

* **Frontend (`client/`)**: Built with React, Vite, and TypeScript. Optimized for static deployment to **Vercel**.
* **Backend (`server/`)**: Built with Node.js, Express, and TypeScript. Designed for deployment as a web service to **Render**.
* **Database & Storage**: Supabase PostgreSQL and Supabase Storage bucket (`garment-images`).
* **AI Engine**: External OpenAI Vision API (`gpt-4o-mini`).

## Project Layout

```
├── client/              # Vite + React (TypeScript) frontend
│   ├── src/
│   │   ├── App.tsx      # Main application tabs (Recommendations, Capture, Wardrobe, Settings)
│   │   ├── index.css    # Design system tokens with Light and Dark mode
│   │   └── main.tsx     # React DOM entry
│   └── package.json
│
├── server/              # Node.js + Express (TypeScript) backend
│   ├── src/
│   │   ├── config/      # Supabase and OpenAI client initializations
│   │   ├── types/       # Domain interfaces matching Supabase tables
│   │   └── server.ts    # Express server with CORS and health check
│   ├── .env.example     # Environment variable template
│   └── package.json
│
├── .gitignore           # Root gitignore protecting secrets and build outputs
└── package.json         # Workspace scripts
```

## Quick Start

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Configure Environment Variables
Copy `server/.env.example` to `server/.env` and supply your credentials:
```env
PORT=5000
CLIENT_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
OPENAI_API_KEY=your-openai-api-key
```

### 3. Run Development Servers
* Run both frontend and backend concurrently in a single terminal:
  ```bash
  npm run dev
  ```
* Or run individually in separate terminals:
  ```bash
  npm run dev:server  # Backend API on http://localhost:5000
  npm run dev:client  # Frontend UI on http://localhost:5173
  ```
