<div align="center">

<img width="1200" height="675" alt="AI Image Studio Hero — A glowing browser canvas displaying an AI-generated coastal painting, surrounded by a golden neural network lattice in deep indigo space" src="docs/hero-banner.png" />

# AI Image Studio

**The open-source AI image generation studio that runs entirely in your browser.**

No sign-up. No backend. No tracking. Just you, your API key, and unlimited creative power.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Try_It_Now-blue?style=for-the-badge&logo=github)](https://ephoenix36.github.io/AI-Image-Studio/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge)](CONTRIBUTING.md)

[Try it live](https://ephoenix36.github.io/AI-Image-Studio/) · [Report Bug](https://github.com/ephoenix36/AI-Image-Studio/issues) · [Request Feature](https://github.com/ephoenix36/AI-Image-Studio/issues)

</div>

---

## Why AI Image Studio?

Most AI image tools either cost $20+/month, lock you into a platform, or require running heavy local infrastructure. AI Image Studio takes a different approach:

- **Bring Your Own Key** — Use Google's free tier (generous daily limits) or pay only for what you generate
- **Zero Infrastructure** — Static site deployed to GitHub Pages. No server, no database, no Docker
- **Privacy First** — Your API key and all project data stay in your browser's local storage. Nothing is ever sent to our servers (we don't have any)
- **Full Featured** — Not a toy. Multi-project workspaces, batch generation, prompt versioning, image editing, reference images, export/import, and more

## Features

| Feature | Description |
|---|---|
| **Multi-Model Support** | Gemini 3.1 Flash, Gemini 2.5 Flash, Gemini 3 Pro, Imagen 4 (Standard/Fast/Ultra) |
| **Batch Generation** | Select multiple prompts and generate all at once with configurable counts |
| **Prompt Studio** | Create, version, tag, and organize custom prompts with folder hierarchies |
| **Reference Images** | Upload or paste reference images to guide generation style and content |
| **Magic Edit** | In-browser image editing with AI-powered inpainting and markup tools |
| **Object Detection** | AI-powered bounding box detection for any image |
| **Project System** | Multiple projects with separate prompt libraries, folders, and assets |
| **Export/Import** | Full project export as `.aistudio.zip` — prompts, images, and metadata |
| **Undo/Redo** | Full operation history with keyboard shortcuts (Ctrl+Z / Ctrl+Y) |
| **Session Cost Tracking** | Real-time estimate of API spend per session with per-model pricing |
| **AI Prompt Wizard** | Let AI generate optimized prompts based on your creative goals |
| **Responsive** | Works on desktop, tablet, and mobile |

## Quick Start

### Option 1: Use the hosted version (recommended)

1. Open **[ephoenix36.github.io/AI-Image-Studio](https://ephoenix36.github.io/AI-Image-Studio/)**
2. Paste your [free Google AI Studio API key](https://aistudio.google.com/app/apikey)
3. Start generating

### Option 2: Run locally

```bash
git clone https://github.com/ephoenix36/AI-Image-Studio.git
cd AI-Image-Studio
pnpm install
pnpm dev
```

Open `http://localhost:3000` — enter your API key in the setup screen.

### Option 3: Fork & deploy your own

1. Fork this repo
2. Enable GitHub Pages (Settings → Pages → Source: GitHub Actions)
3. Push to `main` — the included workflow deploys automatically

No environment variables needed. No secrets to configure.

## Supported Models & Pricing

All pricing below is Google's per-image cost. AI Image Studio has **zero markup**.

| Model | Type | Resolution | Cost/Image |
|---|---|---|---|
| Gemini 3.1 Flash Image | Multimodal | 512–4096px | $0.045 – $0.151 |
| Gemini 2.5 Flash Image | Multimodal | ≤1024px | $0.039 |
| Gemini 3 Pro Image | Multimodal | 1024–4096px | $0.134 – $0.24 |
| Imagen 4 Standard | Text-to-Image | 1K–2K | $0.04 – $0.08 |
| Imagen 4 Fast | Text-to-Image | 1K–2K | $0.02 – $0.04 |
| Imagen 4 Ultra | Text-to-Image | 1K–2K | $0.06 – $0.12 |

> Google's free tier includes generous daily API limits — enough for casual use at zero cost.

## Architecture

```
AI-Image-Studio/
├── src/
│   ├── components/       # UI components (modals, gallery, editor, etc.)
│   ├── contexts/         # AppContext — localStorage-based state management
│   ├── services/         # Google AI SDK integration
│   ├── types/            # TypeScript interfaces
│   ├── utils/            # Utilities (undo/redo, file helpers)
│   ├── constants.ts      # Models, prompt presets, icons
│   └── Studio.tsx        # Main application component
├── index.tsx             # Entry point
├── index.html            # HTML shell with importmap
└── vite.config.ts        # Build config with GitHub Pages base path
```

**Zero backend dependencies.** The app is a static SPA that talks directly to Google's AI APIs from the browser using the official `@google/genai` SDK.

## Tech Stack

- **React 19** + TypeScript
- **Vite** — fast builds, HMR, importmap support
- **Tailwind CSS** — utility-first styling (CDN)
- **Google GenAI SDK** — `@google/genai` for Gemini and Imagen models
- **JSZip** — client-side project export/import
- **GitHub Pages** — zero-cost deployment via Actions

## Privacy & Security

- **No backend, no database, no analytics, no cookies**
- API key stored in `localStorage` — never transmitted except to Google's API endpoints
- All project data (prompts, settings, metadata) stored in `localStorage`
- Generated images exist only in browser memory during the session
- Export your data anytime as a `.zip` file — you own everything

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. Ideas include:

- New model integrations
- UI/UX improvements
- Prompt preset packs for new media types
- Localization
- Performance optimizations

## License

[MIT](LICENSE) © [Enahm Phoenix](https://github.com/ephoenix36)

---

<div align="center">

**If this saved you money or time, consider starring the repo** ⭐

Built by [@ephoenix36](https://github.com/ephoenix36)

</div>
