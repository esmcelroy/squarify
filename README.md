# Squarify

A browser-based tool for padding photos to a uniform aspect ratio — no server, no sign-in, runs entirely in your browser.

## Features

- **Upload up to 20 photos** (JPG, PNG, WebP, GIF) via drag-and-drop or file picker
- **Auto-detects the widest aspect ratio** among your uploaded set and pads all narrower photos to match it
- **Solid color or background image** fill for the padded areas (cover / contain / tile modes)
- **Preview** all photos in a grid; the widest photo is marked with a 👑 "Widest" badge
- **Download** individual padded images or all at once as a ZIP file
- **Remembers your padding settings** across sessions via `localStorage`
- Fully client-side — images never leave your device

## Getting Started

```bash
npm install
npm run dev     # Development server at http://localhost:5173
npm run build   # Production build → dist/
npm run preview # Preview the production build
npm run lint    # Run ESLint
```

## Tech Stack

- React 19 + TypeScript
- Vite 8 with `@tailwindcss/vite` (Tailwind CSS v4)
- `lucide-react` icons
- `jszip` for batch ZIP download
- No backend, no auth, no routing

## How It Works

1. Upload your photos (up to 20).
2. The app finds the **greatest aspect ratio** (widest width ÷ height) in your set.
3. Every photo narrower than that ratio gets a canvas expanded to the target ratio, with the original image centred.
4. Choose a **solid colour** or a **background image** (cover / contain / tile) for the padding fill.
5. Click **Process Images**, then download individually or all at once as a ZIP.