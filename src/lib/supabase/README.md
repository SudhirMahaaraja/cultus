# Supabase Setup Guide for Cultus Office Outfit Assistant

This guide explains what needs to be done in Supabase and what keys/credentials are required for integration into the codebase.

---

## 1. What to do in Supabase (Step-by-Step)

### Step 1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and log in or create an account.
2. Click **New Project**, enter your project name (e.g. `cultus-attire`), database password, and choose your preferred region.
3. Wait for the project database to finish initializing.

### Step 2: Run Database Schema Migration
1. In your Supabase Dashboard, navigate to the **SQL Editor** tab from the left sidebar.
2. Open the file `src/lib/supabase/schema.sql` from this codebase.
3. Paste the contents into the SQL Editor in Supabase.
4. Click **Run** to execute the script. This creates:
   - `clothing_items` table
   - `office_days` table
   - `outfits` table
   - `outfit_feedback` table
   - `wear_history` table
   - Indexes for low-latency queries
   - Row Level Security (RLS) policies

### Step 3: Set Up Storage Bucket for Wardrobe Images
1. Navigate to **Storage** in the Supabase Dashboard.
2. Click **New Bucket**.
3. Name the bucket `garment-images`.
4. Set the bucket access to **Public** (so garment images can be retrieved via public URLs).
5. Add a policy under Storage Policies to allow authenticated/anon users to upload and view images in `garment-images`.

---

## 2. What is needed from Supabase

You need to copy two credentials from your Supabase Project Settings:

1. **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`):
   - Found under **Project Settings** -> **API** -> **Project URL**
   - Format: `https://<your-project-ref>.supabase.co`

2. **Anon Public Key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`):
   - Found under **Project Settings** -> **API** -> **Project API keys** -> `anon` / `public`

---

## 3. How to Add Credentials to the Codebase

Add the copied credentials into your `.env.local` file at the root of the project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-supabase-anon-key
```

---

## 4. Codebase Supabase Architecture

- `src/lib/supabase/client.ts`: Browser-side client instance using `@supabase/ssr`
- `src/lib/supabase/server.ts`: Next.js Server Components / Server Actions client instance
- `src/lib/supabase/schema.sql`: Complete PostgreSQL migration script with RLS
- `src/lib/storage/wardrobeStore.ts`: Automatic fallback to local browser storage if Supabase credentials are not present, ensuring offline-first & seamless setup.
