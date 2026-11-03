# Clutus: Problem Statement & Product Vision

## 1. Executive Summary

Despite owning abundant clothing, most individuals experience daily decision fatigue, repetitive dressing habits, and wardrobe neglect. Studies consistently show that average consumers wear only **20% of their wardrobe 80% of the time**. 

**Clutus** is an AI-orchestrated digital atelier and personal wardrobe system designed to eliminate closet friction. By combining zero-friction multimodal AI ingestion, tactile physical showroom browsing, and occasion-aware outfit synthesis, Clutus transforms static closets into active, intelligent style engines.

---

## 2. Core Problems Being Solved

### Problem 1: The Digitization Barrier (High Cataloging Friction)
* **The Reality:** Existing digital wardrobe applications require users to manually input dozens of metadata tags per garment: category, subcategory, color palette, fabric weight, weave/knit, formality score, and pattern.
* **The Friction:** Cataloging a 40-piece wardrobe manually takes 2 to 3 hours of tedious data entry. Over 85% of users abandon traditional closet apps during initial onboarding.
* **The Clutus Solution:** Zero-friction multimodal vision ingestion. A user snaps a camera photo or drags an image into the viewfinder. An integrated Vision AI (`gpt-4o-mini`) inspects the garment and automatically extracts structured attributes (category, garment type, color, weave, pattern, office suitability, and confidence). The user simply verifies or adjusts with a single tap before committing to persistent storage.

### Problem 2: Morning Decision Fatigue & Context Blindness
* **The Reality:** Dressing well requires simultaneous evaluation of multiple constraints:
  - Occasion and dress code expectations (e.g., casual weekend vs. high-stakes client office meeting).
  - Harmony rules (color matching, texture balance, silhouette pairing).
  - Piece availability and clean rotation.
* **The Friction:** Navigating these constraints under morning time pressure results in default choices, mismatched formality, or outfit dissatisfaction.
* **The Clutus Solution:** Curated 3-slot coordination (**Top + Bottom + Shoes**). The user toggles their occasion (e.g., Casual vs. Office), and the synthesis engine filters active pieces, applies suitability thresholds (such as `office_suitability >= 0.6`), and generates balanced, harmonious outfits instantly.

### Problem 3: The "Forgotten 80%" & Lack of Wear Tracking
* **The Reality:** Garments pushed to the back of physical racks or tucked into drawers disappear from daily awareness. 
* **The Friction:** Users repeatedly wear the same 3 to 5 shirts, forget versatile pieces they already own, and purchase duplicate or near-identical items under the false impression that they "have nothing to wear."
* **The Clutus Solution:** Wear history and active rotation controls. Clutus tracks wear counts and last-worn timestamps, provides quick active/blocked toggles to pull pieces into or out of active rotation, and surfaces underutilized garments during recommendation cycles.

### Problem 4: Sterile, Flat Digital Closet Experiences
* **The Reality:** Most wardrobe apps look and feel like sterile relational database tables or e-commerce catalog grids. They lack the tactile, physical joy of curating clothing.
* **The Friction:** Interacting with a flat grid feels like managing warehouse inventory rather than getting dressed in a personal atelier.
* **The Clutus Solution:** A sensory digital showroom. Clutus features a realistic hanging metallic garment rail governed by critically damped spring physics (hovering or selecting garments gently parts neighboring pieces), 3D perspective tilt pedestals with cursor-tracking specular lighting, dynamic spotlights, and subtle tactile audio feedback synthesized in real time via the Web Audio API.

---

## 3. The Core User Journey

```
[ Step 1: Capture & Ingest ]
  User photographs garment via mobile camera or desktop file drop
           │
           ▼
[ Step 2: Multimodal AI Analysis ]
  Vision API extracts category, color, weave, formality score & confidence
           │
           ▼
[ Step 3: Human-in-the-Loop Verification ]
  User reviews and approves or edits proposed attributes in < 5 seconds
           │
           ▼
[ Step 4: Persistent Cataloging ]
  Garment image stored in Supabase Storage; metadata committed to PostgreSQL
           │
           ▼
[ Step 5: Occasion-Driven Synthesis ]
  User selects occasion (Casual / Office); engine curates Top + Bottom + Shoes
           │
           ▼
[ Step 6: Wear Logging & Continuous Rotation ]
  Outfits marked as worn update rotation metrics and refresh wardrobe balance
```

---

## 4. Key Success Metrics

| Dimension | Legacy Closet Experience | Clutus Target Outcome |
| :--- | :--- | :--- |
| **Cataloging Time** | 3-5 minutes per garment (manual forms) | < 10 seconds per garment (AI analysis + 1-tap verify) |
| **Wardrobe Utilization** | ~20% of owned clothes worn regularly | > 55% active wardrobe rotation across occasions |
| **Morning Decision Time** | 10-15 minutes of closet deliberation | < 60 seconds to synthesize a verified occasion outfit |
| **User Engagement** | High drop-off due to spreadsheet-like UI | High retention driven by tactile physics and sensory atelier UI |

---

## 5. Architectural Pillars Supporting the Solution

1. **Lightweight Decoupled Architecture:** Static client (Vite + React) deployed for instant client-side performance, paired with a dedicated Express API protecting AI keys and database credentials.
2. **Deterministic Data Integrity:** Strict TypeScript interfaces mirroring Supabase relational schemas, ensuring compatibility across clothing categories, scoring rubrics, and wear history logs.
3. **Sensory Engineering:** Tactile physical animations, zero-dependency audio synthesis, and strict dark/light mode consistency supporting personal aesthetic expression.

