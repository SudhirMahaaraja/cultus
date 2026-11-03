# Clutus - AI Wardrobe Atelier & Outfit Stylist

Clutus is an intelligent personal wardrobe system and high-craft digital atelier. It enables users to digitize clothing items using multimodal AI vision (`gpt-4o-mini`), archives garments securely in Supabase PostgreSQL, and generates coordinated three-piece looks (Top + Bottom + Footwear) tailored for Casual Studio or Executive Office occasions.

---

## Core Surfaces & Capabilities

### 1. The Atelier (Harmonious Silhouette Engine)
* **Interactive 3D Pedestals**: Three-column spring-tilt showcase (`01 Upper Body`, `02 Lower Body`, `03 Footwear`) with cursor-following specular spotlight and stage floor reflections.
* **Luxury Empty-Slot Placeholders**: Intelligent fallback placeholders with category wireframe iconography (`Shirt`, `Scissors`, `Footprints`) and direct one-click selection from the wardrobe.
* **Dynamic AI Stylist Evaluation**: Computes real-time silhouette harmony percentage, color affinity gamut (Monochromatic, Dual-Tone, Harmonious Triad), and tailored editorial critiques based on active garments.
* **Occasion Dial**: Segmented dial switching between Weekend & Studio Dress and Professional Tailored Standard.

### 2. Showroom Catalog & Digital Closet
* **Google Photos-Inspired Gallery Grid**: Clean floating cutout gallery with isolated garment tiles, category filter pills (`All`, `Tops`, `Bottoms`, `Shoes`), instant search, and one-tap equip actions.
* **Physical Suspension Rail**: Interactive chrome suspension rail with spring-mass-damper physics where hovering or selecting garments smoothly slides neighboring hangers.
* **Garment Inspection Modal**: Deep-dive attribute inspector showing weave knit, pattern constraints, office suitability gauge, color swatches, active/blocked toggles, and direct removal.

### 3. Digitize Piece (Multimodal Vision Chamber)
* **Optical HUD Viewfinder**: High-tech camera dropzone featuring technical corner brackets, radar scanning sweep, reticle crosshair, and animated laser beam.
* **Real-time Pipeline Telemetry**: Step-by-step progress feedback tracking image upload, neural vision drape and color extraction, constraint validation, and database persistence.

### 4. Studio Settings & Sensory Feedback
* **Atmosphere Themes**: Full support for both Obsidian Noir (dark) and Warm Alabaster (light) luxury atelier themes.
* **Sensory Audio Synthesis**: Zero-latency mechanical audio clicks and slides generated in real time using the browser Web Audio API.
* **Mobile Responsiveness**: Adaptive viewport system with a collapsible frosted glass hamburger drawer, two-column digital closet grid, and touch-optimized controls for mobile devices (including 393px viewports like the Redmi Note 8 Pro).

---

## Architecture & Technology Stack

* **Frontend (`client/`)**:
  * React 18, Vite 6, TypeScript
  * Lucide Icons
  * Web Audio API synthesized tactile feedback
  * Specular 3D card tilt physics and Geom geometric typography
* **Backend (`server/`)**:
  * Node.js, Express, TypeScript, TSX
  * Multer in-memory buffer streaming
  * Azure OpenAI / OpenAI Vision SDK (`gpt-4o-mini`)
  * Permissive local subnet CORS and 0.0.0.0 network binding
* **Data & Storage**:
  * Supabase PostgreSQL (`clothing_items` table with strict pattern, category, and weave check constraints)
  * Supabase Storage private bucket (`garment-images`) with 7-day signed URL resolution

---

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── GarmentDetailModal.tsx   # Garment inspection and attribute modal
│   │   │   ├── GarmentImage.tsx         # Resilient luxury image showcase with vector fallback
│   │   │   ├── InteractiveCard.tsx      # 3D perspective spring tilt with cursor spotlight
│   │   │   └── WardrobeRack.tsx         # Google Photos gallery grid and suspension rail
│   │   ├── types/
│   │   │   └── clothing.ts              # Clothing interfaces and attribute enums
│   │   ├── utils/
│   │   │   ├── rackPhysics.ts           # Spring physics calculations for suspension rail
│   │   │   └── sound.ts                 # Web Audio API procedural sound synthesizers
│   │   ├── App.tsx                      # Primary application layout, drawer, and state
│   │   ├── index.css                    # Design system tokens, typography, and responsive rules
│   │   ├── main.tsx                     # React root mount
│   │   └── vite-env.d.ts                # Ambient Vite client type definitions
│   ├── index.html                       # HTML template with fonts and noise layer
│   ├── package.json
│   └── vite.config.ts                   # Vite config with 0.0.0.0 host binding and backend proxy
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── openai.ts                # Azure OpenAI / OpenAI Vision client initialization
│   │   │   └── supabase.ts              # Supabase database and storage client initialization
│   │   ├── types/
│   │   │   └── index.ts                 # Server domain interfaces
│   │   └── server.ts                    # Express REST API, upload routes, and normalizers
│   ├── .env.example                     # Environment configuration template
│   └── package.json
│
├── .gitignore                           # Comprehensive monorepo gitignore
├── package.json                         # Root scripts running client and server concurrently
├── PROBLEM_STATEMENT.md                 # Design dilemma analysis and architectural solution
└── README.md                            # Project documentation
```

---

## Quick Start

### 1. Install Dependencies
Install all workspace dependencies from root:
```bash
npm run install:all
```

### 2. Configure Environment Variables
Create `server/.env` based on `server/.env.example`:
```env
PORT=5000
CLIENT_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Azure OpenAI (or standard OpenAI)
OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
OPENAI_API_KEY=your-api-key
OPENAI_LLM=gpt-4o-mini
OPENAI_API_VERSION=2024-08-01-preview
```

### 3. Run Development Servers
Start both backend (port 5000) and frontend (port 5173) with a single command:
```bash
npm run dev
```

Or run services individually:
```bash
npm run dev:server   # Starts Express API on http://0.0.0.0:5000
npm run dev:client   # Starts Vite dev server on http://0.0.0.0:5173
```

---

## Mobile & Local Network Access

Both the Express backend and Vite frontend are configured to bind to `0.0.0.0`. When connected to the same local Wi-Fi network, access the application from mobile devices (such as a Redmi Note 8 Pro):

1. Find your local IPv4 address (e.g., `ipconfig` on Windows shows `192.168.1.14`).
2. Open your mobile browser and navigate to:
   ```
   http://<YOUR_LOCAL_IP>:5173
   ```
   Example: `http://192.168.1.14:5173`
3. The frontend dynamically resolves the backend host and routes requests to `http://<YOUR_LOCAL_IP>:5000`, enabling garment ingestion and look synthesis directly from mobile cameras.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server and database connectivity health check |
| `GET` | `/api/garments` | Retrieves all clothing items with signed Supabase Storage URLs |
| `POST` | `/api/garments/upload` | Uploads garment image, extracts vision attributes, and persists item |
| `PATCH` | `/api/garments/:id` | Updates garment attributes or toggles recommendation eligibility |
| `DELETE` | `/api/garments/:id` | Deletes garment record and associated storage assets |
