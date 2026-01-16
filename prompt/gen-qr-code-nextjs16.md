# Prompt: Generate QR Code Project (Next.js 16 Serverless)

## 🎯 Objective

Create a **QR Code Generator web application** using **Next.js 16** with a **serverless-first architecture**. The project should allow users to input text or a URL and generate a downloadable QR Code image.

The output should be a **production-ready project structure**, following **Next.js 16 best practices**.

---

## 🧩 Core Requirements

### 1. Framework & Architecture

* Use **Next.js 16**
* Use **App Router only** (`/app` directory)
* Serverless-first approach (Vercel compatible)
* No custom backend server (no Express, Fastify)
* Use **Route Handlers** (`app/api/**/route.ts`) for QR generation
* Prefer **React Server Components (RSC)** by default

### 2. Runtime

* API routes must explicitly declare runtime:

  * `export const runtime = 'nodejs'` (for QR libraries)
* Client components must be marked with `'use client'`

### 3. Features

* Input field for:

  * URL
  * Plain text
* Generate QR Code on submit
* Display generated QR Code preview
* Download QR Code as PNG
* Optional: set QR size (256, 512, 1024)

### 4. QR Code Generation

* Use a stable QR library compatible with Node.js:

  * `qrcode`
* QR generation logic must run **server-side only**
* Return QR as:

  * Base64 PNG
  * or streamed image response

### 5. UI / UX

* Simple, clean UI
* Responsive (mobile & desktop)
* Use **Tailwind CSS**
* Loading state while generating QR
* Basic validation (empty input not allowed)
* Error handling for invalid input

---

## 🗂️ File Structure (Expected)

```
/app
  /page.tsx              # Server Component
  /api/qr/route.ts      # Serverless Route Handler
/components
  QRForm.tsx            # Client Component
  QRPreview.tsx         # Client Component
/lib
  qr.ts                 # QR generation logic
/public
/styles
```

---

## 🔐 Non-Functional Requirements

* Written in **TypeScript (strict mode)**
* Use `next.config.ts`
* Environment variables via `.env.local`
* No deprecated APIs (no `pages/`, no `getServerSideProps`)
* Clean, readable, well-commented code

---

## 🚀 Deployment

* Must deploy to **Vercel** with zero config
* Compatible with **Vercel Serverless Functions**
* No filesystem writes at runtime

---

## 📄 Deliverables

* Complete Next.js 16 project source code
* `README.md` including:

  * Project overview
  * Local development steps
  * Environment variables
  * Vercel deployment guide

---

## 🧠 Optional Enhancements

* Copy QR image to clipboard
* Dark mode (Tailwind + CSS variables)
* Client-side QR history (localStorage)
* SEO metadata using `generateMetadata`

---

## 🗣️ Prompt Usage Instruction

Use this prompt to instruct an AI code generator to:

* Generate all required files
* Follow Next.js 16 conventions strictly
* Use Server Components by default
* Avoid unnecessary explanations
* Focus on correctness, scalability, and best practices

---

**End of Prompt**
