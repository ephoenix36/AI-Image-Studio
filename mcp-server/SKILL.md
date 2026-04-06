---
name: ai-image-studio-mcp
description: 'MCP server for AI image generation, analysis, and transformation. Tools: generate_image (Imagen 4/Gemini, model/resolution/aspect selection, references, auto-improve), analyze_image (CLIP-like description), apply_filter, convert_format, crop_image, generate_prompt, resize_image, rotate_image, set/get_output_directory, list_models. Default model: Imagen 4 Fast.'
tools:
  - generate_image
  - analyze_image
  - apply_filter
  - convert_format
  - crop_image
  - generate_prompt
  - resize_image
  - rotate_image
  - set_output_directory
  - get_output_directory
  - list_models
---

# AI Image Studio MCP Skill

## Overview

MCP server providing AI-powered image generation, analysis, and local transformation tools. Backed by Google Imagen 4 and Gemini models for generation/analysis, and Sharp for local image processing.

## Available Tools

| Tool | Description |
|------|-------------|
| `generate_image` | Generate images from text prompts with model, resolution, aspect ratio, reference images, and auto-improve options |
| `analyze_image` | CLIP-like image analysis returning subjects, style, composition, colors, mood, and tags |
| `apply_filter` | Apply filters: grayscale, blur, sharpen, negate, sepia, tint, brightness, contrast, saturation |
| `convert_format` | Convert between png, jpeg, webp, avif, tiff with quality control |
| `crop_image` | Crop to a rectangular region by pixel coordinates |
| `generate_prompt` | Generate high-quality image prompts from a brief concept with optional style/purpose context |
| `resize_image` | Resize with fit modes: cover, contain, fill, inside, outside |
| `rotate_image` | Rotate by any angle with configurable background |
| `set_output_directory` | Set where generated/processed images are saved |
| `get_output_directory` | Get the current output directory |
| `list_models` | List all available models with capabilities, pricing, and notes |

## Models

| Model | Type | Price/Image | Notes |
|-------|------|-------------|-------|
| **Imagen 4 Fast** ⭐ | text-to-image | $0.02 | Default. Fast iterations, 1K/2K |
| Imagen 4 Standard | text-to-image | $0.04 | Balanced quality & cost |
| Imagen 4 Ultra | text-to-image | $0.06 | Highest quality, 1 image max |
| Gemini 3.1 Flash Image | multimodal | $0.045 | Supports reference images, 512–4096px |
| Gemini 2.5 Flash Image | multimodal | $0.039 | ≤1024px, good for iterative editing |
| Gemini 3 Pro Image | multimodal | $0.134 | Premium multimodal generation |

## Configuration

Requires `GOOGLE_API_KEY` environment variable. Add to VS Code MCP config:

```json
{
  "mcpServers": {
    "ai-image-studio": {
      "command": "node",
      "args": ["<path-to>/AI-Image-Studio/mcp-server/build/index.js"],
      "env": {
        "GOOGLE_API_KEY": "${env:GOOGLE_API_KEY}"
      }
    }
  }
}
```

## Usage Patterns

### Generate an image
```
generate_image({ prompt: "A sunset over mountains", model: "imagen-4.0-fast-generate-001", aspectRatio: "16:9" })
```

### Generate with auto-improved prompt
```
generate_image({ prompt: "cat on a couch", autoImprovePrompt: true })
```

### Generate with reference images (Gemini models only)
```
generate_image({ prompt: "Similar style but with a beach", model: "gemini-3.1-flash-image-preview", referenceImages: ["path/to/ref.png"] })
```

### Analyze an image
```
analyze_image({ imagePath: "photo.jpg", detail: "detailed" })
```

### Generate a production-ready prompt
```
generate_prompt({ concept: "luxury watch on marble", style: "photorealistic", purpose: "e-commerce" })
```
