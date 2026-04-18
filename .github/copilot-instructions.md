## Project context
- Squarify: browser-based photo padding tool that normalizes aspect ratios
- Fully client-side React + TypeScript app — no backend, no auth, no routing
- Images never leave the user's device

## Tech Stack
- React 19 + TypeScript
- Vite 8 with `@tailwindcss/vite` (Tailwind CSS v4)
- `lucide-react` for icons
- `jszip` for batch ZIP download
- Vitest + React Testing Library for unit/integration tests
- Playwright for E2E UI tests

## Project Structure
```
src/
  App.tsx              – Main app component (upload → process → download flow)
  main.tsx             – React entry point
  types.ts             – Shared TypeScript types (UploadedPhoto, PaddingSettings)
  index.css            – Tailwind CSS entry
  components/
    PhotoUpload.tsx     – Drag-and-drop / file picker upload zone
    PhotoGrid.tsx       – Grid display of uploaded/processed photos
    PaddingSettingsPanel.tsx – Settings UI (color/image fill, process button)
  hooks/
    useLocalStorage.ts  – Generic localStorage-backed state hook
  lib/
    imageUtils.ts       – Pure image processing logic (aspect ratio, canvas padding)
e2e/                   – Playwright E2E test specs
```

## Development Principles
- Test-Driven Development: Red-Green-Refactor cycle
- Incremental Changes: Small, testable modifications
- Systematic Debugging: Use test failures as guides
- Validation Before Commit: All tests pass, no lint errors

## Testing Scope
- **Unit tests (Vitest)**: Pure logic in `lib/imageUtils.ts`, hooks, utility functions
- **E2E tests (Playwright)**: Critical user journeys — upload, process, download
- Keep unit tests fast and DOM-independent where possible
- E2E tests use chromium only for CI speed

## Testing Commands
```bash
npm test              # Run Vitest unit tests
npm run test:ui       # Run Playwright E2E tests
npm run test:ui:install  # Install Playwright browsers
```

## Git Workflow
- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, etc.
- Feature branches: `feature/<descriptive-name>`
- Always stage all changes before committing: `git add .`
- Push to the correct branch: `git push origin <branch-name>`

## CI/CD
- GitHub Actions CI: lint, typecheck, unit tests, Playwright UI tests
- GitHub Pages deployment on push to `main`
- Vite `base` is configured for GitHub Pages

## Key Patterns
- All image processing happens on `<canvas>` elements in the browser
- Photos are stored as data URLs in React state (not persisted to disk/server)
- Settings are persisted via `localStorage` using the `useLocalStorage` hook
- The `findMaxAspectRatio` function determines the target aspect ratio from uploaded photos
- `padImageToAspectRatio` creates a new canvas at the target ratio and centers the original image
