# Contributing to AI Image Studio

First off, thank you for considering contributing! Every contribution helps make this project better.

## How Can I Contribute?

### Reporting Bugs

- Check if the bug has already been reported in [Issues](https://github.com/ephoenix36/AI-Image-Studio/issues)
- Use the [bug report template](https://github.com/ephoenix36/AI-Image-Studio/issues/new?template=bug-report.yml) to create a new issue
- Include as much detail as possible — browser, OS, steps to reproduce

### Suggesting Features

- Check [existing feature requests](https://github.com/ephoenix36/AI-Image-Studio/issues?q=is%3Aissue+label%3Aenhancement) first
- Use the [feature request template](https://github.com/ephoenix36/AI-Image-Studio/issues/new?template=feature-request.yml)
- Describe the problem you're solving, not just the solution

### Code Contributions

#### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 10+

#### Setup

```bash
# 1. Fork the repository
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/AI-Image-Studio.git
cd AI-Image-Studio

# 3. Install dependencies
pnpm install

# 4. Start dev server
pnpm dev
```

Open `http://localhost:3000` — enter your [Google AI Studio API key](https://aistudio.google.com/app/apikey) in the setup screen.

#### Development Workflow

```bash
# Run in development mode
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

#### Architecture Overview

```
src/
├── components/       # UI components (modals, gallery, editor, etc.)
├── contexts/         # AppContext — localStorage-based state management
├── services/         # Google AI SDK integration
├── types/            # TypeScript interfaces
├── utils/            # Utilities (undo/redo, file helpers)
├── constants.ts      # Models, prompt presets, icons
└── Studio.tsx        # Main application component
```

Key principles:
- **Zero backend** — everything runs client-side
- **localStorage** for persistence — no database
- **Tailwind CSS** via CDN — utility-first styling
- **React 19** with TypeScript strict mode

#### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Use For |
|---|---|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `docs:` | Documentation changes |
| `test:` | Adding or updating tests |
| `refactor:` | Code changes that don't fix bugs or add features |
| `chore:` | Maintenance tasks, dependency updates |
| `ci:` | CI/CD changes |

#### Pull Request Process

1. Create a branch from `main` (`feat/your-feature-name` or `fix/your-bug-name`)
2. Make your changes, ensuring the build passes (`pnpm build`)
3. Write a clear PR description using the template
4. Link any related issues
5. Request review from maintainers

### Documentation

Fix typos, improve clarity, add examples — documentation PRs are always welcome and don't need tests.

### Ideas for Contributions

- **New prompt preset packs** for different media types
- **UI/UX improvements** and accessibility enhancements
- **Localization** (i18n support)
- **Performance optimizations**
- **New model integrations** as Google releases them

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## Questions?

Open a [Discussion](https://github.com/ephoenix36/AI-Image-Studio/discussions) for general questions or ideas.
