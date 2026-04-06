#!/usr/bin/env node

/**
 * AI Image Studio MCP Server v1.0.0
 *
 * Tools:
 *   generate_image      — AI image generation (Imagen 4, Gemini models)
 *   analyze_image       — CLIP-like image description and analysis
 *   apply_filter        — Apply visual filters (grayscale, blur, sharpen, etc.)
 *   convert_format      — Convert between image formats (png, jpeg, webp, avif, tiff)
 *   crop_image          — Crop an image to specified region
 *   generate_prompt     — Generate a high-quality image prompt from a brief description
 *   resize_image        — Resize an image to target dimensions
 *   rotate_image        — Rotate an image by degrees
 *   set_output_directory — Set the output directory for saved images
 *   get_output_directory — Get the current output directory
 *   list_models         — List available image generation models with descriptions
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { GoogleGenAI, Modality } from "@google/genai";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseCliArgs(): { projectRoot?: string } {
  const args = process.argv.slice(2);
  const result: { projectRoot?: string } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--project-root" && i + 1 < args.length) {
      result.projectRoot = args[i + 1];
      i++;
    }
  }
  return result;
}

const cliArgs = parseCliArgs();

// ============================================================================
// Configuration
// ============================================================================

const projectRoot =
  cliArgs.projectRoot || process.env.PROJECT_ROOT || process.cwd();

const config = {
  googleApiKey: process.env.GOOGLE_API_KEY,
  projectRoot,
  imageOutputDir:
    process.env.IMAGE_OUTPUT_DIR ||
    path.join(projectRoot, "generated_images"),
};

const runtimeState = {
  currentOutputDir: config.imageOutputDir,
};

// ============================================================================
// Client Initialization
// ============================================================================

let genaiClient: GoogleGenAI | null = null;

if (config.googleApiKey) {
  genaiClient = new GoogleGenAI({ apiKey: config.googleApiKey });
  console.error("✓ Google AI client initialized");
} else {
  console.error(
    "⚠ GOOGLE_API_KEY not set — generation and analysis tools will be unavailable"
  );
}

// ============================================================================
// Model Registry
// ============================================================================

interface ModelDef {
  id: string;
  name: string;
  type: "text-to-image" | "multimodal";
  description: string;
  pricePerImage: number;
  supportedAspectRatios: string[];
  supportedResolutions: string[];
  supportsReferences: boolean;
  notes: string;
}

const IMAGE_MODELS: ModelDef[] = [
  {
    id: "imagen-4.0-fast-generate-001",
    name: "Imagen 4 Fast",
    type: "text-to-image",
    description:
      "Fast generation — ideal for quick iterations and drafts. Best cost-to-quality ratio.",
    pricePerImage: 0.02,
    supportedAspectRatios: ["1:1", "3:4", "4:3", "9:16", "16:9"],
    supportedResolutions: ["1024", "2048"],
    supportsReferences: false,
    notes: "Default model. Up to 4 images per request. Fixed resolution (imageSize not adjustable).",
  },
  {
    id: "imagen-4.0-generate-001",
    name: "Imagen 4 Standard",
    type: "text-to-image",
    description:
      "High quality — excellent balance of quality and cost for production use.",
    pricePerImage: 0.04,
    supportedAspectRatios: ["1:1", "3:4", "4:3", "9:16", "16:9"],
    supportedResolutions: ["1024", "2048"],
    supportsReferences: false,
    notes: "Up to 4 images per request. 1K ($0.04) / 2K ($0.08).",
  },
  {
    id: "imagen-4.0-ultra-generate-001",
    name: "Imagen 4 Ultra",
    type: "text-to-image",
    description:
      "Highest quality — best detail, photorealism, and texture fidelity for professional work.",
    pricePerImage: 0.06,
    supportedAspectRatios: ["1:1", "3:4", "4:3", "9:16", "16:9"],
    supportedResolutions: ["1024", "2048"],
    supportsReferences: false,
    notes: "1 image per request. 1K ($0.06) / 2K ($0.12). Best for final production assets.",
  },
  {
    id: "gemini-3.1-flash-image-preview",
    name: "Gemini 3.1 Flash Image",
    type: "multimodal",
    description:
      "Next-gen Gemini image generation with high quality. Supports reference images for guided generation.",
    pricePerImage: 0.045,
    supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    supportedResolutions: ["512", "1024", "2048", "4096"],
    supportsReferences: true,
    notes: "Multimodal — can accept reference images. Resolution set via prompt hint.",
  },
  {
    id: "gemini-2.5-flash-image",
    name: "Gemini 2.5 Flash Image",
    type: "multimodal",
    description:
      "Gemini multimodal image generation, great for conversational editing and reference-guided work.",
    pricePerImage: 0.039,
    supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    supportedResolutions: ["1024"],
    supportsReferences: true,
    notes: "Multimodal — limited to ≤1024px. Good for iterative editing.",
  },
  {
    id: "gemini-3-pro-image-preview",
    name: "Gemini 3 Pro Image",
    type: "multimodal",
    description:
      "Higher-tier Gemini model for premium multimodal image generation.",
    pricePerImage: 0.134,
    supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    supportedResolutions: ["1024", "2048", "4096"],
    supportsReferences: true,
    notes: "Multimodal — supports references. Higher cost but superior quality.",
  },
];

const DEFAULT_MODEL = "imagen-4.0-fast-generate-001";

// ============================================================================
// Utilities
// ============================================================================

function promptToSlug(prompt: string, maxLength = 50): string {
  if (!prompt?.trim()) return "image";
  return (
    prompt
      .substring(0, maxLength)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "image"
  );
}

async function ensureOutputDir(): Promise<void> {
  await fs.mkdir(runtimeState.currentOutputDir, { recursive: true });
}

async function saveImage(
  imageBuffer: Buffer,
  format = "png",
  prompt?: string
): Promise<string> {
  await ensureOutputDir();
  const slug = prompt ? promptToSlug(prompt) : "image";
  const filename = `${slug}_${Date.now()}.${format}`;
  const filepath = path.join(runtimeState.currentOutputDir, filename);
  await fs.writeFile(filepath, imageBuffer);
  return filepath;
}

function parseImageInput(
  imageData: string
): { buffer: Buffer; mimeType: string } | null {
  try {
    if (imageData.startsWith("data:")) {
      const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return { buffer: Buffer.from(match[2], "base64"), mimeType: match[1] };
      }
    }
    // Try raw base64
    const buf = Buffer.from(imageData, "base64");
    if (buf.length > 0) return { buffer: buf, mimeType: "image/png" };
  } catch {
    /* fall through */
  }
  return null;
}

async function loadImageFromPath(
  imagePath: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const resolved = path.isAbsolute(imagePath)
    ? imagePath
    : path.resolve(config.projectRoot, imagePath);
  const buf = await fs.readFile(resolved);
  const ext = path.extname(resolved).toLowerCase().replace(".", "");
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    avif: "image/avif",
    tiff: "image/tiff",
    gif: "image/gif",
  };
  return { buffer: buf, mimeType: mimeMap[ext] || "image/png" };
}

async function resolveImageInput(
  imageData?: string,
  imagePath?: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (imagePath) return loadImageFromPath(imagePath);
  if (imageData) {
    const parsed = parseImageInput(imageData);
    if (parsed) return parsed;
    // Try as file path
    return loadImageFromPath(imageData);
  }
  throw new Error("Provide either imageData (base64/data-URI) or imagePath.");
}

/**
 * Detect the actual image format from buffer magic bytes.
 * This is the ground truth — never trust declared MIME types.
 */
function detectMimeFromBytes(buf: Buffer): string {
  if (buf.length < 12) return "image/png";
  // PNG: \x89PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  // JPEG: \xFF\xD8\xFF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // WebP: RIFF....WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  // GIF: GIF87a or GIF89a
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  // TIFF: II (little-endian) or MM (big-endian)
  if ((buf[0] === 0x49 && buf[1] === 0x49) || (buf[0] === 0x4d && buf[1] === 0x4d)) return "image/tiff";
  // AVIF/HEIF: ....ftyp at offset 4
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = buf.subarray(8, 12).toString("ascii");
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "image/avif";
    return "image/heif";
  }
  return "image/png"; // fallback
}

function textResponse(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

/**
 * Build an MCP image response. The MIME type is ALWAYS detected from the
 * actual buffer bytes to prevent mismatch errors with downstream APIs.
 */
function imageResponse(
  text: string,
  images: Array<{ buffer: Buffer; mimeType?: string }>
) {
  const content: Array<{
    type: string;
    text?: string;
    data?: string;
    mimeType?: string;
  }> = [{ type: "text", text }];
  for (const img of images) {
    const trueMime = detectMimeFromBytes(img.buffer);
    content.push({
      type: "image",
      data: img.buffer.toString("base64"),
      mimeType: trueMime,
    });
  }
  return { content };
}

function requireClient(): GoogleGenAI {
  if (!genaiClient) {
    throw new Error(
      "GOOGLE_API_KEY is not configured. Set it in your environment to use AI features."
    );
  }
  return genaiClient;
}

// ============================================================================
// Tool Definitions
// ============================================================================

const tools: Tool[] = [
  // ── Generation ──────────────────────────────────────────────────────────
  {
    name: "generate_image",
    description:
      "Generate an AI image from a text prompt. Supports model selection, aspect ratio, resolution, optional reference images, and automatic prompt improvement.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Text description of the image to generate.",
        },
        model: {
          type: "string",
          description: `Model ID to use. Default: ${DEFAULT_MODEL}. Use list_models to see options.`,
        },
        aspectRatio: {
          type: "string",
          enum: ["1:1", "3:4", "4:3", "9:16", "16:9"],
          description: "Aspect ratio for the output image. Default: 1:1.",
        },
        resolution: {
          type: "string",
          enum: ["512", "1024", "2048", "4096"],
          description:
            "Target resolution. For Imagen models: 1024 (1K) or 2048 (2K). For Gemini: 512–4096.",
        },
        autoImprovePrompt: {
          type: "boolean",
          description:
            "If true, the prompt is automatically enhanced by AI before generation for higher quality results. Default: false.",
        },
        referenceImages: {
          type: "array",
          items: { type: "string" },
          description:
            "Array of reference image data URIs or file paths. Only supported by multimodal models (Gemini). Ignored for Imagen models.",
        },
        numberOfImages: {
          type: "number",
          description:
            "Number of images to generate (1–4). Imagen Ultra is limited to 1. Default: 1.",
        },
        save: {
          type: "boolean",
          description:
            "Whether to save the generated image to the output directory. Default: true.",
        },
      },
      required: ["prompt"],
    },
  },

  // ── Analysis ────────────────────────────────────────────────────────────
  {
    name: "analyze_image",
    description:
      "Analyze an image and return a detailed CLIP-like description including subjects, style, composition, colors, mood, and technical details.",
    inputSchema: {
      type: "object",
      properties: {
        imageData: {
          type: "string",
          description: "Image as a base64 string or data URI.",
        },
        imagePath: {
          type: "string",
          description: "File path to the image (absolute or relative to project root).",
        },
        detail: {
          type: "string",
          enum: ["brief", "standard", "detailed"],
          description:
            "Level of analysis detail. 'brief' = one-line caption, 'standard' = structured description, 'detailed' = exhaustive breakdown. Default: standard.",
        },
      },
    },
  },

  // ── Filter ──────────────────────────────────────────────────────────────
  {
    name: "apply_filter",
    description:
      "Apply a visual filter to an image. Supports grayscale, blur, sharpen, negate, sepia, tint, brightness, contrast, and saturation adjustments.",
    inputSchema: {
      type: "object",
      properties: {
        imageData: {
          type: "string",
          description: "Image as a base64 string or data URI.",
        },
        imagePath: {
          type: "string",
          description: "File path to the image.",
        },
        filter: {
          type: "string",
          enum: [
            "grayscale",
            "blur",
            "sharpen",
            "negate",
            "sepia",
            "tint",
            "brightness",
            "contrast",
            "saturation",
          ],
          description: "Filter to apply.",
        },
        intensity: {
          type: "number",
          description:
            "Filter intensity (0.0–10.0). Meaning varies by filter: blur sigma, sharpen sigma, brightness/contrast/saturation multiplier. Default: 1.0.",
        },
        tintColor: {
          type: "string",
          description:
            "Hex color for tint filter (e.g. '#FF6600'). Only used when filter is 'tint'.",
        },
        save: {
          type: "boolean",
          description: "Save result to output directory. Default: true.",
        },
      },
      required: ["filter"],
    },
  },

  // ── Format Conversion ──────────────────────────────────────────────────
  {
    name: "convert_format",
    description:
      "Convert an image to a different format (png, jpeg, webp, avif, tiff).",
    inputSchema: {
      type: "object",
      properties: {
        imageData: {
          type: "string",
          description: "Image as a base64 string or data URI.",
        },
        imagePath: {
          type: "string",
          description: "File path to the image.",
        },
        format: {
          type: "string",
          enum: ["png", "jpeg", "webp", "avif", "tiff"],
          description: "Target format.",
        },
        quality: {
          type: "number",
          description:
            "Quality for lossy formats (1–100). Default: 85 for jpeg/webp, 50 for avif.",
        },
        save: {
          type: "boolean",
          description: "Save result to output directory. Default: true.",
        },
      },
      required: ["format"],
    },
  },

  // ── Crop ────────────────────────────────────────────────────────────────
  {
    name: "crop_image",
    description:
      "Crop an image to a specified rectangular region.",
    inputSchema: {
      type: "object",
      properties: {
        imageData: {
          type: "string",
          description: "Image as a base64 string or data URI.",
        },
        imagePath: {
          type: "string",
          description: "File path to the image.",
        },
        left: {
          type: "number",
          description: "Left edge of crop region in pixels.",
        },
        top: {
          type: "number",
          description: "Top edge of crop region in pixels.",
        },
        width: {
          type: "number",
          description: "Width of crop region in pixels.",
        },
        height: {
          type: "number",
          description: "Height of crop region in pixels.",
        },
        save: {
          type: "boolean",
          description: "Save result to output directory. Default: true.",
        },
      },
      required: ["left", "top", "width", "height"],
    },
  },

  // ── Prompt Generation ──────────────────────────────────────────────────
  {
    name: "generate_prompt",
    description:
      "Generate a high-quality, detailed image generation prompt from a brief description or concept. Returns an optimized prompt ready for use with generate_image.",
    inputSchema: {
      type: "object",
      properties: {
        concept: {
          type: "string",
          description:
            "Brief description of the desired image (e.g. 'sunset over mountains', 'product shot of headphones').",
        },
        style: {
          type: "string",
          description:
            "Optional style hint (e.g. 'photorealistic', 'anime', 'oil painting', 'minimalist').",
        },
        purpose: {
          type: "string",
          description:
            "Optional purpose context (e.g. 'e-commerce listing', 'social media post', 'album cover').",
        },
        numberOfPrompts: {
          type: "number",
          description: "Number of prompt variations to generate (1–5). Default: 1.",
        },
      },
      required: ["concept"],
    },
  },

  // ── Resize ──────────────────────────────────────────────────────────────
  {
    name: "resize_image",
    description:
      "Resize an image to target dimensions. Supports fit modes: cover, contain, fill, inside, outside.",
    inputSchema: {
      type: "object",
      properties: {
        imageData: {
          type: "string",
          description: "Image as a base64 string or data URI.",
        },
        imagePath: {
          type: "string",
          description: "File path to the image.",
        },
        width: {
          type: "number",
          description: "Target width in pixels. Omit to auto-scale from height.",
        },
        height: {
          type: "number",
          description: "Target height in pixels. Omit to auto-scale from width.",
        },
        fit: {
          type: "string",
          enum: ["cover", "contain", "fill", "inside", "outside"],
          description:
            "How to fit the image into the target dimensions. Default: 'contain'.",
        },
        save: {
          type: "boolean",
          description: "Save result to output directory. Default: true.",
        },
      },
    },
  },

  // ── Rotate ──────────────────────────────────────────────────────────────
  {
    name: "rotate_image",
    description:
      "Rotate an image by a specified angle in degrees. Positive = clockwise.",
    inputSchema: {
      type: "object",
      properties: {
        imageData: {
          type: "string",
          description: "Image as a base64 string or data URI.",
        },
        imagePath: {
          type: "string",
          description: "File path to the image.",
        },
        angle: {
          type: "number",
          description: "Rotation angle in degrees (positive = clockwise).",
        },
        background: {
          type: "string",
          description:
            "Background color for non-90° rotations as hex (e.g. '#FFFFFF'). Default: transparent.",
        },
        save: {
          type: "boolean",
          description: "Save result to output directory. Default: true.",
        },
      },
      required: ["angle"],
    },
  },

  // ── Output Directory ───────────────────────────────────────────────────
  {
    name: "set_output_directory",
    description:
      "Set the directory where generated and processed images will be saved.",
    inputSchema: {
      type: "object",
      properties: {
        directory: {
          type: "string",
          description:
            "Absolute or relative path to the output directory. Created if it doesn't exist.",
        },
      },
      required: ["directory"],
    },
  },
  {
    name: "get_output_directory",
    description: "Get the current output directory where images are saved.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  // ── List Models ─────────────────────────────────────────────────────────
  {
    name: "list_models",
    description:
      "List all available image generation models with their capabilities, pricing, and notes.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["all", "text-to-image", "multimodal"],
          description: "Filter by model type. Default: all.",
        },
      },
    },
  },
];

// ============================================================================
// Tool Handlers
// ============================================================================

async function handleGenerateImage(args: Record<string, unknown>) {
  const client = requireClient();
  let prompt = args.prompt as string;
  const modelId = (args.model as string) || DEFAULT_MODEL;
  const aspectRatio = (args.aspectRatio as string) || "1:1";
  const resolution = args.resolution as string | undefined;
  const autoImprove = (args.autoImprovePrompt as boolean) ?? false;
  const refImages = (args.referenceImages as string[]) || [];
  const numImages = Math.min(Math.max((args.numberOfImages as number) || 1, 1), 4);
  const shouldSave = (args.save as boolean) ?? true;

  const model = IMAGE_MODELS.find((m) => m.id === modelId);
  if (!model) {
    return textResponse(
      `Unknown model: ${modelId}. Use list_models to see available options.`
    );
  }

  // Auto-improve prompt if requested
  if (autoImprove) {
    const enhanced = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert image prompt engineer. Enhance the following image generation prompt to produce a higher quality, more detailed result. Keep the core intent but add professional photography/art direction details like lighting, composition, texture, and mood. Return ONLY the enhanced prompt, nothing else.\n\nOriginal prompt: "${prompt}"`,
    });
    const improvedText = enhanced.text?.trim();
    if (improvedText) prompt = improvedText;
  }

  const isImagen = model.type === "text-to-image";

  if (isImagen) {
    // Imagen models don't support references
    // imageSize (1K/2K) is only supported by Standard and Ultra, not Fast
    const imagenSizeMap: Record<string, string> = {
      "1024": "1K",
      "2048": "2K",
    };
    const supportsImageSize = !modelId.includes("fast");
    const imageSize =
      resolution && supportsImageSize ? imagenSizeMap[resolution] : undefined;

    const response = await client.models.generateImages({
      model: modelId,
      prompt,
      config: {
        numberOfImages: Math.min(
          numImages,
          modelId.includes("ultra") ? 1 : 4
        ),
        ...(aspectRatio
          ? {
              aspectRatio: aspectRatio as
                | "1:1"
                | "3:4"
                | "4:3"
                | "9:16"
                | "16:9",
            }
          : {}),
        ...(imageSize ? { imageSize } : {}),
      },
    });

    if (!response.generatedImages?.length) {
      return textResponse("Image generation failed — no images returned.");
    }

    const results: Array<{ buffer: Buffer; mimeType: string; path?: string }> =
      [];
    const paths: string[] = [];

    for (const img of response.generatedImages) {
      const buf = Buffer.from(img.image!.imageBytes as string, "base64");
      let savedPath: string | undefined;
      if (shouldSave) {
        savedPath = await saveImage(buf, "png", prompt);
        paths.push(savedPath);
      }
      results.push({ buffer: buf, mimeType: "image/png", path: savedPath });
    }

    const summary = [
      `Generated ${results.length} image(s) with ${model.name}`,
      `Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? "..." : ""}"`,
      `Aspect ratio: ${aspectRatio}`,
      resolution ? `Resolution: ${resolution}px` : null,
      autoImprove ? "Prompt was auto-improved" : null,
      paths.length ? `Saved to:\n${paths.map((p) => `  • ${p}`).join("\n")}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    return imageResponse(summary, results);
  } else {
    // Gemini multimodal model
    const parts: Array<Record<string, unknown>> = [];

    // Add reference images
    for (const ref of refImages) {
      try {
        const { buffer, mimeType } = await resolveImageInput(ref);
        parts.push({
          inlineData: {
            data: buffer.toString("base64"),
            mimeType,
          },
        });
      } catch (e: unknown) {
        console.error(`Failed to load reference image: ${e}`);
      }
    }

    const resHint =
      resolution && resolution !== "1024"
        ? ` Output resolution: ${resolution}x${resolution}px.`
        : "";
    const refHint =
      refImages.length > 0
        ? `Using the provided reference image(s) as strong inspiration, generate a new image for this request: "${prompt}"${resHint}`
        : `${prompt}${resHint}`;

    parts.push({ text: refHint });

    const response = await client.models.generateContent({
      model: modelId,
      contents: { parts },
      config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });

    for (const part of response.candidates![0].content!.parts!) {
      if (part.inlineData) {
        const buf = Buffer.from(part.inlineData.data as string, "base64");
        const mime = part.inlineData.mimeType || "image/png";
        let savedPath: string | undefined;
        if (shouldSave) {
          const ext = mime.split("/")[1] || "png";
          savedPath = await saveImage(buf, ext, prompt);
        }

        const summary = [
          `Generated image with ${model.name}`,
          `Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? "..." : ""}"`,
          refImages.length ? `Reference images: ${refImages.length}` : null,
          autoImprove ? "Prompt was auto-improved" : null,
          savedPath ? `Saved to: ${savedPath}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        return imageResponse(summary, [
          { buffer: buf, mimeType: mime },
        ]);
      }
    }

    return textResponse(
      "Image generation did not return an image. The model may have responded with text only."
    );
  }
}

async function handleAnalyzeImage(args: Record<string, unknown>) {
  const client = requireClient();
  const { buffer, mimeType } = await resolveImageInput(
    args.imageData as string | undefined,
    args.imagePath as string | undefined
  );
  const detail = (args.detail as string) || "standard";

  const detailPrompts: Record<string, string> = {
    brief:
      "Provide a single-sentence caption describing this image. Be concise and descriptive.",
    standard: `Analyze this image and provide a structured description:
- **Subject**: What is depicted
- **Style**: Art style, photography type, or rendering technique
- **Composition**: Layout, framing, perspective
- **Colors**: Dominant color palette and mood
- **Lighting**: Light source, quality, direction
- **Mood/Atmosphere**: Overall feeling
- **Technical**: Resolution quality, any artifacts or notable qualities
- **Tags**: Comma-separated keywords for search/categorization`,
    detailed: `Provide an exhaustive analysis of this image:
1. **Primary Subject**: Detailed description of the main subject
2. **Secondary Elements**: Background, supporting objects, context
3. **Art Style / Medium**: Photography, digital art, painting style, etc.
4. **Composition**: Rule of thirds, symmetry, leading lines, depth
5. **Color Palette**: List specific colors, harmony type, temperature
6. **Lighting**: Direction, quality (hard/soft), color temperature, shadows
7. **Mood & Atmosphere**: Emotional tone, narrative feeling
8. **Technical Quality**: Sharpness, noise, resolution, artifacts
9. **Potential Use Cases**: What this image would be suitable for
10. **Reproduction Prompt**: A detailed prompt that could recreate a similar image
11. **Tags**: Comprehensive comma-separated keywords`,
  };

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { inlineData: { data: buffer.toString("base64"), mimeType } },
        { text: detailPrompts[detail] || detailPrompts.standard },
      ],
    },
  });

  return textResponse(response.text || "Analysis returned no results.");
}

async function handleApplyFilter(args: Record<string, unknown>) {
  const { buffer } = await resolveImageInput(
    args.imageData as string | undefined,
    args.imagePath as string | undefined
  );
  const filter = args.filter as string;
  const intensity = (args.intensity as number) ?? 1.0;
  const shouldSave = (args.save as boolean) ?? true;

  let pipeline = sharp(buffer);
  const meta = await sharp(buffer).metadata();

  switch (filter) {
    case "grayscale":
      pipeline = pipeline.grayscale();
      break;
    case "blur":
      pipeline = pipeline.blur(Math.max(0.3, intensity));
      break;
    case "sharpen":
      pipeline = pipeline.sharpen({ sigma: Math.max(0.1, intensity) });
      break;
    case "negate":
      pipeline = pipeline.negate();
      break;
    case "sepia":
      // Sepia via tint after grayscale
      pipeline = pipeline.grayscale().tint({ r: 112, g: 66, b: 20 });
      break;
    case "tint": {
      const hex = (args.tintColor as string) || "#FF6600";
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      pipeline = pipeline.tint({ r, g, b });
      break;
    }
    case "brightness":
      pipeline = pipeline.modulate({ brightness: intensity });
      break;
    case "contrast":
      // Sharp uses linear for contrast: a * pixel + b
      pipeline = pipeline.linear(intensity, -(128 * (intensity - 1)));
      break;
    case "saturation":
      pipeline = pipeline.modulate({ saturation: intensity });
      break;
    default:
      return textResponse(`Unknown filter: ${filter}`);
  }

  const outputBuf = await pipeline.toBuffer();
  // Detect actual output format from bytes (not input metadata)
  const outputMime = detectMimeFromBytes(outputBuf);
  const outputExt = outputMime.split("/")[1] || "png";

  let savedPath: string | undefined;
  if (shouldSave) {
    savedPath = await saveImage(outputBuf, outputExt, `${filter}_filtered`);
  }

  return imageResponse(
    [
      `Applied '${filter}' filter${intensity !== 1.0 ? ` (intensity: ${intensity})` : ""}`,
      `Original: ${meta.width}×${meta.height} ${meta.format}`,
      savedPath ? `Saved to: ${savedPath}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    [{ buffer: outputBuf, mimeType: outputMime }]
  );
}

async function handleConvertFormat(args: Record<string, unknown>) {
  const { buffer } = await resolveImageInput(
    args.imageData as string | undefined,
    args.imagePath as string | undefined
  );
  const format = args.format as string;
  const shouldSave = (args.save as boolean) ?? true;

  const qualityDefaults: Record<string, number> = {
    jpeg: 85,
    webp: 85,
    avif: 50,
  };
  const quality =
    (args.quality as number) || qualityDefaults[format] || undefined;

  const meta = await sharp(buffer).metadata();
  let pipeline = sharp(buffer);

  switch (format) {
    case "png":
      pipeline = pipeline.png();
      break;
    case "jpeg":
      pipeline = pipeline.jpeg({ quality });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality });
      break;
    case "avif":
      pipeline = pipeline.avif({ quality });
      break;
    case "tiff":
      pipeline = pipeline.tiff();
      break;
    default:
      return textResponse(`Unsupported format: ${format}`);
  }

  const outputBuf = await pipeline.toBuffer();

  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpeg: "image/jpeg",
    webp: "image/webp",
    avif: "image/avif",
    tiff: "image/tiff",
  };

  // Detect actual format from bytes to prevent MIME mismatch errors
  const actualMime = detectMimeFromBytes(outputBuf);
  const actualFormat = actualMime.split("/")[1] || format;

  let savedPath: string | undefined;
  if (shouldSave) {
    savedPath = await saveImage(outputBuf, actualFormat, "converted");
  }

  return imageResponse(
    [
      `Converted from ${meta.format} → ${actualFormat}${actualFormat !== format ? ` (requested ${format} — native binary may need rebuild)` : ""}`,
      `Size: ${(outputBuf.length / 1024).toFixed(1)} KB`,
      quality ? `Quality: ${quality}` : null,
      savedPath ? `Saved to: ${savedPath}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    [{ buffer: outputBuf, mimeType: actualMime }]
  );
}

async function handleCropImage(args: Record<string, unknown>) {
  const { buffer } = await resolveImageInput(
    args.imageData as string | undefined,
    args.imagePath as string | undefined
  );
  const left = args.left as number;
  const top = args.top as number;
  const width = args.width as number;
  const height = args.height as number;
  const shouldSave = (args.save as boolean) ?? true;

  const meta = await sharp(buffer).metadata();
  const outputBuf = await sharp(buffer)
    .extract({ left, top, width, height })
    .toBuffer();

  const format = meta.format || "png";
  let savedPath: string | undefined;
  if (shouldSave) {
    savedPath = await saveImage(outputBuf, format, "cropped");
  }

  return imageResponse(
    [
      `Cropped to ${width}×${height} from position (${left}, ${top})`,
      `Original: ${meta.width}×${meta.height}`,
      savedPath ? `Saved to: ${savedPath}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    [{ buffer: outputBuf, mimeType: `image/${format}` }]
  );
}

async function handleGeneratePrompt(args: Record<string, unknown>) {
  const client = requireClient();
  const concept = args.concept as string;
  const style = (args.style as string) || "";
  const purpose = (args.purpose as string) || "";
  const numPrompts = Math.min(Math.max((args.numberOfPrompts as number) || 1, 1), 5);

  const systemPrompt = `You are an expert AI image prompt engineer. Your prompts produce stunning, professional-quality images.

Rules:
- Write detailed, specific prompts that include subject, composition, lighting, color palette, mood, and style
- Use professional photography/art terminology
- Each prompt should be self-contained and ready to use directly with an image generation model
- Include technical quality markers (e.g., "8K resolution", "sharp focus", "professional photography")
- Avoid generic filler; every word should contribute to the image quality
- Return ONLY the prompt(s), one per line, no numbering or commentary`;

  const userPrompt = [
    `Generate ${numPrompts} high-quality image generation prompt(s) for:`,
    `Concept: ${concept}`,
    style ? `Style: ${style}` : null,
    purpose ? `Purpose/Context: ${purpose}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userPrompt,
    config: { systemInstruction: systemPrompt },
  });

  const text = response.text?.trim();
  if (!text) return textResponse("Failed to generate prompts.");

  const prompts = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return textResponse(
    [
      `**Generated ${prompts.length} prompt(s)** for "${concept}":\n`,
      ...prompts.map((p, i) => `**${i + 1}.** ${p}`),
    ].join("\n")
  );
}

async function handleResizeImage(args: Record<string, unknown>) {
  const { buffer } = await resolveImageInput(
    args.imageData as string | undefined,
    args.imagePath as string | undefined
  );
  const width = args.width as number | undefined;
  const height = args.height as number | undefined;
  const fit = (args.fit as keyof sharp.FitEnum) || "contain";
  const shouldSave = (args.save as boolean) ?? true;

  if (!width && !height) {
    return textResponse("Provide at least one of width or height.");
  }

  const meta = await sharp(buffer).metadata();
  const outputBuf = await sharp(buffer)
    .resize({ width, height, fit })
    .toBuffer();

  const newMeta = await sharp(outputBuf).metadata();
  const format = meta.format || "png";

  let savedPath: string | undefined;
  if (shouldSave) {
    savedPath = await saveImage(outputBuf, format, "resized");
  }

  return imageResponse(
    [
      `Resized: ${meta.width}×${meta.height} → ${newMeta.width}×${newMeta.height}`,
      `Fit: ${fit}`,
      savedPath ? `Saved to: ${savedPath}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    [{ buffer: outputBuf, mimeType: `image/${format}` }]
  );
}

async function handleRotateImage(args: Record<string, unknown>) {
  const { buffer } = await resolveImageInput(
    args.imageData as string | undefined,
    args.imagePath as string | undefined
  );
  const angle = args.angle as number;
  const background = (args.background as string) || undefined;
  const shouldSave = (args.save as boolean) ?? true;

  const meta = await sharp(buffer).metadata();

  let bgColor: { r: number; g: number; b: number; alpha: number } | undefined;
  if (background) {
    const r = parseInt(background.slice(1, 3), 16);
    const g = parseInt(background.slice(3, 5), 16);
    const b = parseInt(background.slice(5, 7), 16);
    bgColor = { r, g, b, alpha: 1 };
  }

  const outputBuf = await sharp(buffer)
    .rotate(angle, bgColor ? { background: bgColor } : undefined)
    .toBuffer();

  const newMeta = await sharp(outputBuf).metadata();
  const format = meta.format || "png";

  let savedPath: string | undefined;
  if (shouldSave) {
    savedPath = await saveImage(outputBuf, format, "rotated");
  }

  return imageResponse(
    [
      `Rotated ${angle}° clockwise`,
      `${meta.width}×${meta.height} → ${newMeta.width}×${newMeta.height}`,
      savedPath ? `Saved to: ${savedPath}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    [{ buffer: outputBuf, mimeType: `image/${format}` }]
  );
}

async function handleSetOutputDirectory(args: Record<string, unknown>) {
  const dir = args.directory as string;
  const resolved = path.isAbsolute(dir)
    ? dir
    : path.resolve(config.projectRoot, dir);

  await fs.mkdir(resolved, { recursive: true });
  runtimeState.currentOutputDir = resolved;

  return textResponse(`Output directory set to: ${resolved}`);
}

async function handleGetOutputDirectory() {
  return textResponse(
    `Current output directory: ${runtimeState.currentOutputDir}`
  );
}

async function handleListModels(args: Record<string, unknown>) {
  const typeFilter = (args.type as string) || "all";
  const filtered =
    typeFilter === "all"
      ? IMAGE_MODELS
      : IMAGE_MODELS.filter((m) => m.type === typeFilter);

  const lines = filtered.map((m) => {
    const defaultTag = m.id === DEFAULT_MODEL ? " ⭐ DEFAULT" : "";
    return [
      `### ${m.name}${defaultTag}`,
      `- **ID**: \`${m.id}\``,
      `- **Type**: ${m.type}`,
      `- **Price**: $${m.pricePerImage.toFixed(3)}/image`,
      `- **Aspect Ratios**: ${m.supportedAspectRatios.join(", ")}`,
      `- **Resolutions**: ${m.supportedResolutions.join(", ")}`,
      `- **Reference Images**: ${m.supportsReferences ? "✅ Yes" : "❌ No"}`,
      `- **Description**: ${m.description}`,
      m.notes ? `- **Notes**: ${m.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return textResponse(
    `# Available Image Models\n\n${lines.join("\n\n")}`
  );
}

// ============================================================================
// Server Setup
// ============================================================================

const server = new Server(
  { name: "ai-image-studio", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case "generate_image":
        return await handleGenerateImage(args);
      case "analyze_image":
        return await handleAnalyzeImage(args);
      case "apply_filter":
        return await handleApplyFilter(args);
      case "convert_format":
        return await handleConvertFormat(args);
      case "crop_image":
        return await handleCropImage(args);
      case "generate_prompt":
        return await handleGeneratePrompt(args);
      case "resize_image":
        return await handleResizeImage(args);
      case "rotate_image":
        return await handleRotateImage(args);
      case "set_output_directory":
        return await handleSetOutputDirectory(args);
      case "get_output_directory":
        return await handleGetOutputDirectory();
      case "list_models":
        return await handleListModels(args);
      default:
        return textResponse(`Unknown tool: ${name}`);
    }
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`Tool '${name}' error:`, error);
    return textResponse(`Error: ${msg}`);
  }
});

// ============================================================================
// Start
// ============================================================================

async function main() {
  console.error("AI Image Studio MCP Server v1.0.0 starting...");
  console.error(`Output directory: ${runtimeState.currentOutputDir}`);
  console.error(`Default model: ${DEFAULT_MODEL}`);
  console.error(`Available models: ${IMAGE_MODELS.map((m) => m.name).join(", ")}`);
  console.error(`Google AI: ${genaiClient ? "✓ Ready" : "✗ Not configured"}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✓ MCP server connected via stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
