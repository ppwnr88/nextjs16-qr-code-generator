# gen-qr — QR Code Generator (Next.js 16, Serverless)

A production-ready **QR Code Generator** built with **Next.js 16 (App Router)** and a **serverless-first** architecture. Users can enter text or a URL, generate a QR code, preview it, and download it as a PNG.

## Features

- Generate QR codes from **plain text** or **URLs**
- **Server-side** QR generation via Next.js **Route Handlers**
- **Download as PNG**
- Optional QR sizes (e.g. 256 / 512 / 1024)
- Clean, responsive UI with **Tailwind CSS**
- Loading + validation + error handling
- Vercel-compatible (no custom server, no filesystem writes)

## Tech Stack

- Next.js 16 (App Router, RSC-first)
- TypeScript (strict)
- Tailwind CSS
- `qrcode` (Node.js-compatible QR generation)

---

## Getting Started (Local Development)

### 1) Install dependencies

```/dev/null/sh#L1-5
npm install
# or
pnpm install
# or
yarn
```

### 2) Configure environment variables

Create `.env.local` in the project root (see **Environment Variables** below).

### 3) Run the dev server

```/dev/null/sh#L1-3
npm run dev
```

Open: `http://localhost:3000`

---

## Environment Variables

This project is designed to work with **zero required env vars** by default.

Optional variables you may add to `.env.local`:

```/dev/null/env#L1-20
# Base URL used for metadata generation (recommended for correct OpenGraph/canonical URLs).
# Example:
# NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional hard limit on allowed input length for QR generation (defense-in-depth).
# If implemented, the API route may use this value to reject very large payloads.
# QR_INPUT_MAX_LENGTH=2048
```

Notes:
- Only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.
- QR generation runs server-side; do not place secrets in client-exposed variables.

---

## Project Structure

```/dev/null/txt#L1-40
/app
  /page.tsx              # Server Component (main page)
  /api/qr/route.ts       # Route Handler (serverless QR generation, nodejs runtime)
/components
  QRForm.tsx             # Client Component (input + submit)
  QRPreview.tsx          # Client Component (preview + download)
/lib
  qr.ts                  # QR generation logic (server-only)
/public                  # Static assets
/styles                  # Global styles (Tailwind, etc.)
```

---

## API

### `POST /api/qr`

Generates a QR code server-side.

**Request body (JSON):**
- `text` (string, required)
- `size` (number, optional; e.g. 256, 512, 1024)

**Response:**
- Typically returns a PNG as **base64** or as an **image response**, depending on implementation.

Example (client-side fetch):

```/dev/null/ts#L1-28
const res = await fetch('/api/qr', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'https://example.com', size: 512 }),
});

if (!res.ok) throw new Error('Failed to generate QR');
const data = await res.json(); // e.g. { dataUrl: "data:image/png;base64,..." }
```

---

## Deployment (Vercel)

This project is built to deploy to **Vercel with zero config**.

### Option A: Deploy from GitHub (recommended)

1. Push the repository to GitHub.
2. Go to Vercel Dashboard → **New Project**.
3. Import your repository.
4. (Optional) Set environment variables:
   - `NEXT_PUBLIC_SITE_URL` = `https://your-production-domain.com`
5. Click **Deploy**.

### Option B: Deploy with Vercel CLI

```/dev/null/sh#L1-6
npm i -g vercel
vercel login
vercel
vercel --prod
```

### Runtime Notes

- The QR generation API route should declare:
  - `export const runtime = 'nodejs'`
- This ensures compatibility with Node-based QR libraries (like `qrcode`).

---

## Non-Goals / Constraints

- No `pages/` directory
- No `getServerSideProps`
- No custom backend server (Express/Fastify/etc.)
- No filesystem writes at runtime

---

## Scripts

Typical scripts (depending on your package manager / setup):

```/dev/null/sh#L1-10
npm run dev       # Start dev server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Lint
```

---

## License

MIT (or update this section to match your preferred license).