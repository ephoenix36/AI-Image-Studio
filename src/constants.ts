import type { Tip, MediaCategories, MediaType } from './types';

export const tips: Tip[] = [
    { title: "Subject Details", description: "Specify type, color, material, size, and unique features." },
    { title: "Composition & Angle", description: "Describe the view (e.g., flat lay, 45-degree angle) and placement." },
    { title: "Lighting & Mood", description: "Include light source (e.g., soft natural daylight) and atmosphere." },
    { title: "Background", description: "Opt for clean (white/transparent) or contextual backgrounds." },
    { title: "Style & Quality", description: "Reference photography styles (e.g., hyper-realistic) and add enhancers." },
    { title: "Negative Prompts", description: "Exclude unwanted elements (e.g., 'no text, no blur') to refine outputs." },
];

export const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"];

export const IMAGE_RESOLUTIONS = ['512', '1024', '2048', '4096'];

export interface ImageModelDef {
    id: string;
    name: string;
    type: 'text-to-image' | 'multimodal';
    supportsResolution: boolean;
    /** Cost per output image, keyed by pixel size ('512','1024','2048','4096') or 'default' */
    costPerImage: Record<string, number>;
    note?: string;
}

export const IMAGE_MODELS: ImageModelDef[] = [
    { id: 'gemini-3.1-flash-image-preview', name: 'Gemini 3.1 Flash Image', type: 'multimodal', supportsResolution: true, costPerImage: { '512': 0.045, '1024': 0.067, '2048': 0.101, '4096': 0.151 } },
    { id: 'gemini-2.5-flash-image',          name: 'Gemini 2.5 Flash Image', type: 'multimodal', supportsResolution: false, costPerImage: { default: 0.039 }, note: '≤1024px' },
    { id: 'gemini-3-pro-image-preview',       name: 'Gemini 3 Pro Image',     type: 'multimodal', supportsResolution: true,  costPerImage: { '1024': 0.134, '2048': 0.134, '4096': 0.24 } },
    { id: 'imagen-4.0-generate-001',          name: 'Imagen 4 Standard',      type: 'text-to-image', supportsResolution: true, costPerImage: { default: 0.04, '1024': 0.04, '2048': 0.08 }, note: '1K / 2K' },
    { id: 'imagen-4.0-fast-generate-001',     name: 'Imagen 4 Fast',          type: 'text-to-image', supportsResolution: true, costPerImage: { default: 0.02, '1024': 0.02, '2048': 0.04 }, note: '1K / 2K' },
    { id: 'imagen-4.0-ultra-generate-001',    name: 'Imagen 4 Ultra',         type: 'text-to-image', supportsResolution: true, costPerImage: { default: 0.06, '1024': 0.06, '2048': 0.12 }, note: '1K / 2K' },
];

export const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-image-preview';

export const EDIT_MODELS = [
    { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash', type: 'multimodal' },
] as const;

export const DEFAULT_DESCRIPTIONS: Record<MediaType, string> = {
    "Products": "A high-end, solar-powered watch with a leather strap.",
    "Documents & Media": "An invitation to a grand opening gala.",
    "Posters & Art": "A poster for a summer music festival.",
    "People & Characters": "A professional headshot of a confident CEO.",
    "Design & Concepts": "A logo concept for a new coffee brand called 'Aura Beans'.",
    "Virtual Try-On": "A person trying on a stylish leather jacket.",
    "Stylized Portraits": "A portrait of a person in the style of Studio Ghibli."
};

export const MEDIA_CATEGORIES: MediaCategories = {
    "Products": [
        {
            category: "Minimalist Studio Shots",
            description: "Clean, versatile for E-Commerce",
            prompts: [
                "Photorealistic product shot of [subject] on a plain white background, centered with soft studio lighting from above, subtle shadows for depth, hyper-detailed textures, 8K resolution, sharp focus, professional photography style.",
                "High-resolution close-up of [subject] in minimalist luxury style, clean white background, soft diffused lighting, shallow depth of field, hyper-detailed and accurate, emulates commercial advertising photography.",
                "Editorial flat lay of [subject] arranged thoughtfully on a neutral gray surface, top-down view, hard directional lighting with defined shadows and high contrast, monochromatic tones, premium material highlights, realistic and tactile."
            ]
        },
        {
            category: "Lifestyle and Contextual Scenes",
            description: "Engaging for Social Media/Ads",
            prompts: [
                "Lifestyle image of [subject] in a modern kitchen by a sunny window, natural daylight with condensation and subtle reflections, wooden table surface, photorealistic, warm inviting mood, high detail on features, 4K quality.",
                "Photorealistic render of [subject] on a reflective marble countertop in an an outdoor garden setting, soft morning light filtering through leaves, elegant and serene atmosphere, detailed textures, wide-angle shot, professional e-commerce style.",
                "Dynamic product ad scene: [subject] placed in a cozy living room with bookshelves in the background, golden hour lighting casting warm glows and soft shadows, hyper-realistic, inviting and aspirational mood, sharp focus."
            ]
        },
    ],
    "Documents & Media": [
        {
            category: "Vintage & Historical",
            description: "Aged paper, classic typography",
            prompts: [
                "An ancient, weathered scroll, [subject], laid out on a dark oak historian's desk, illuminated by candlelight, detailed paper texture with frayed edges, calligraphic script, photorealistic, moody atmosphere.",
                "Flat lay of a vintage 1940s newspaper, [subject], with a classic fountain pen and a pair of spectacles resting on it, aged yellowed paper, slightly faded ink, natural light from a window, nostalgic mood, hyper-detailed.",
                "A stack of old, leather-bound books, with one open to a page showing [subject], in a dusty, sun-drenched library, shafts of light illuminating dust motes, rich textures, academic and timeless feel, 8K resolution.",
            ]
        },
        {
            category: "Modern & Corporate",
            description: "Clean, professional, and sleek",
            prompts: [
                "A pristine, professionally designed business report, [subject], on a minimalist glass conference table, with a sleek laptop and a modern coffee cup nearby, clean lines, corporate environment, bright and airy lighting.",
                "Mockup of a modern tri-fold brochure, [subject], standing on a clean white surface with a subtle gradient background, studio lighting, sharp focus on typography and graphics, professional and crisp aesthetic.",
                "Digital tablet displaying a vibrant infographic, [subject], held by a person in a modern office, background blurred to show a professional setting, screen reflections visible, high-tech and informative style.",
            ]
        },
    ],
    "Posters & Art": [
        {
            category: "Movie & Event Posters",
            description: "Dramatic, eye-catching designs",
            prompts: [
                "A vintage-style movie poster for [subject], inspired by 1950s sci-fi films, with bold typography, dramatic illustrations, and a distressed paper texture, retro color palette.",
                "Minimalist indie music festival poster, [subject], featuring clean geometric shapes and a limited color palette on a textured paper background, modern Swiss design style, elegant and artistic.",
                "An epic fantasy movie poster for [subject], with a heroic central figure, dramatic cinematic lighting, swirling magical effects, and a highly detailed fantasy landscape in the background, Lord of the Rings style.",
            ]
        },
        {
            category: "Artistic Styles",
            description: "Emulating various art forms",
            prompts: [
                "A beautiful watercolor painting of [subject], with soft, bleeding colors and visible paper texture, impressionistic style, light and airy feel.",
                "A detailed cyberpunk city scene, [subject], with towering neon skyscrapers, flying vehicles, and rain-slicked streets reflecting the vibrant lights, futuristic and dystopian atmosphere, digital art, Blade Runner aesthetic.",
                "An intricate pen and ink illustration of [subject], with detailed cross-hatching and stippling, printed on high-quality textured paper, black and white, reminiscent of a classic storybook illustration.",
            ]
        },
    ],
    "People & Characters": [
        {
            category: "Professional Headshots",
            description: "Corporate, creative, and branding portraits",
            prompts: [
                "Corporate headshot of [subject], against a blurred modern office background, professional attire, confident expression, soft and even lighting, shallow depth of field, shot on a Canon EOS R5 with an 85mm f/1.2 lens, photorealistic.",
                "Creative professional headshot of [subject], an artist in their studio, natural light from a large window, candid and approachable pose, background shows canvases and art supplies, authentic and inspiring mood, hyper-detailed.",
                "Outdoor branding headshot of [subject], a tech entrepreneur, in a vibrant urban environment, golden hour lighting, leading lines from the architecture, friendly smile, cinematic style, high resolution.",
            ]
        },
        {
            category: "Character Design",
            description: "For games, stories, and concept art",
            prompts: [
                "Full-body concept art of [subject], a rugged space explorer, wearing a futuristic armored suit with glowing blue accents, standing on a barren alien planet with two moons in the sky, detailed sci-fi design, digital painting, cinematic lighting.",
                "Detailed character portrait of [subject], a wise old wizard with a long white beard and mystical robes, in a dimly lit library filled with ancient books, holding a glowing crystal orb, fantasy art style, atmospheric and magical, highly detailed face.",
                "Turnaround sheet of [subject], a cheerful anime-style magical girl, showing front, side, and back views, vibrant color palette, clean line art, cel-shaded, includes details of her wand and costume, Ghibli-inspired.",
            ]
        },
    ],
    "Design & Concepts": [
        {
            category: "Logo & Icon Design",
            description: "Branding concepts and app icons",
            prompts: [
                "Minimalist vector logo design for [subject], clean lines, clever use of negative space, on a white background, Behance graphic design contest winner, modern and memorable.",
                "A set of 9 sleek, modern app icons for [subject], following a consistent design language, vibrant gradient colors, subtle shadows for depth, presented on a grid, UI/UX design, dribbble-worthy.",
                "Emblem-style logo for [subject], a craft brewery, featuring vintage typography and illustrative elements, on a textured paper background, rustic and authentic feel, high detail.",
            ]
        },
        {
            category: "Product & Industrial Design",
            description: "Sketches and renders of physical products",
            prompts: [
                "Industrial design sketch of [subject], a futuristic electric motorcycle, showing dynamic angles and design details, marker pen rendering style with digital highlights, on a gray background, concept art.",
                "3D product render of [subject], a smart home device, on a minimalist background, studio lighting, highlighting the materials and form, sleek and modern aesthetic, photorealistic, marketing image.",
                "Exploded view diagram of [subject], a mechanical watch, showing all the intricate internal components, technical illustration style, clean lines and labels, highly detailed and precise.",
            ]
        },
        {
            category: "Architecture & Interior Design",
            description: "Visualizing spaces and buildings",
            prompts: [
                "Architectural visualization of [subject], a modern glass and wood cabin in a forest, surrounded by tall trees, warm light glowing from within, photorealistic render, serene and peaceful atmosphere, dusk lighting.",
                "Interior design concept for [subject], a Scandinavian-style living room, with minimalist furniture, light wood floors, and large windows, natural light filling the space, cozy and bright, 3D render.",
                "Futuristic architectural concept of [subject], a sustainable skyscraper with vertical gardens and sky bridges, in a bustling metropolis, daytime, wide-angle shot, eco-futurism style, detailed and inspiring.",
            ]
        }
    ],
    "Virtual Try-On": [
        {
            category: "Apparel",
            description: "Visualize clothing on a model",
            prompts: [
                "Photorealistic image of a female model with a cheerful expression wearing [subject], standing in a bright, modern clothing boutique, full-body shot, soft natural lighting, high detail on fabric texture and drape, 8K, fashion photography.",
                "A male model with an athletic build wearing [subject] while jogging through a park at sunrise, dynamic motion blur on background, sharp focus on the apparel, golden hour lighting, realistic sweat and fabric creases, lifestyle sports photography.",
                "Ghost mannequin product shot of [subject], on a clean light gray background, showing the shape and fit without a model, studio lighting, perfectly symmetrical, hyper-detailed stitching, e-commerce style.",
            ]
        },
        {
            category: "Hairstyles & Accessories",
            description: "Preview new looks and items",
            prompts: [
                "Close-up portrait of a woman with [subject] hairstyle, facing forward, smiling softly, studio lighting with a beauty dish, flawless skin, every strand of hair is detailed and realistic, shallow depth of field, professional salon photo.",
                "A person from behind wearing [subject] hat, looking out over a scenic mountain view, natural outdoor lighting, detailed texture on the hat and hair, aspirational travel blogger style photo.",
                "Fashion portrait of a person wearing [subject] glasses, in a chic urban cafe setting, cinematic lighting, reflections in the lenses, confident and stylish pose, detailed shot focusing on the face and accessory.",
            ]
        },
    ],
    "Stylized Portraits": [
        {
            category: "Animation & Anime Styles",
            description: "Transform portraits into popular styles",
            prompts: [
                "A portrait of [subject], drawn in the beautiful and nostalgic style of Studio Ghibli, soft watercolor background of a grassy field, gentle and heartwarming expression, detailed hand-drawn look.",
                "Character portrait of [subject], in the style of classic 1990s Disney animation, expressive eyes, bold lines, vibrant cel-shading, dynamic pose, cheerful and heroic mood.",
                "A portrait of [subject], depicted in the bold, geometric art style of Genndy Tartakovsky's 'Samurai Jack', sharp angles, limited color palette, dramatic lighting and shadows, highly stylized.",
            ]
        },
        {
            category: "Cartoon & Satirical Styles",
            description: "Fun and exaggerated artistic takes",
            prompts: [
                "A cartoon drawing of [subject] in the style of 'South Park', simple construction paper cutout look, big expressive eyes, standing at a bus stop in a snowy town.",
                "A portrait of [subject] in the signature style of 'The Simpsons', yellow skin, overbite, simple and clean lines, standing in front of the family couch in a familiar living room.",
                "A caricature of [subject] in the quirky, gothic style of Tim Burton, large expressive eyes, thin limbs, muted color palette with occasional splashes of color, whimsical and slightly dark atmosphere.",
            ]
        }
    ]
};

export const WIZARD_SYSTEM_PROMPT = `# Role: Expert AI Image Prompt Engineer

Your task is to transform a user's simple description of a subject into a set of diverse, high-quality, and detailed image generation prompts suitable for models like Imagen or DALL-E. You must enrich the user's concept with professional photographic, artistic, and stylistic terminology.

# Core Principles

When generating prompts, you must incorporate a rich combination of the following elements:
1.  **Subject Details**: Clearly define the subject, including its material (e.g., matte plastic, brushed aluminum, grained leather, aged parchment), color, and any unique features.
2.  **Composition & Angle**: Specify the shot type, such as \`product shot\`, \`lifestyle image\`, \`flat lay\`, \`close-up macro shot\`, \`45-degree angle\`, or \`top-down view\`.
3.  **Lighting**: Describe the lighting conditions with professional terms like \`soft studio lighting\`, \`dramatic cinematic lighting\`, \`natural daylight from a window\`, \`golden hour\`, or \`hard directional lighting with defined shadows\`.
4.  **Background & Environment**: Define the setting, from simple options like \`plain white background\` or \`gradient background\` to complex scenes like \`on a reflective marble countertop\`, \`in a modern kitchen\`, or \`on a wooden table in a cozy cafe\`.
5.  **Style & Quality**: Reference specific photography or art styles and quality enhancers. Use terms like \`photorealistic\`, \`hyper-detailed\`, \`8K resolution\`, \`sharp focus\`, \`editorial photography\`, \`commercial advertising style\`, \`minimalist luxury style\`, \`watercolor painting\`, \`vintage movie poster\`.
6.  **Mood & Atmosphere**: Convey a feeling, such as \`warm and inviting\`, \`sleek and futuristic\`, \`serene and elegant\`, \`luxurious and aspirational\`, or \`nostalgic and timeless\`.

# User Instructions
- The user will provide their goal, optional instructions/context, and the desired number of prompts. You must adhere to the requested number of prompts.
- **You must generate the exact number of prompts requested by the user.**

# Workflow and Output Format

You must follow this two-part structure precisely.

**Part 1: Planned Prompts**
First, provide a numbered list outlining the prompts you are about to generate. For each item, include a descriptive title and a brief explanation of the scene or style you are creating.

**Part 2: Generated Prompts**
Second, provide the final, new-line separated prompts inside a single Markdown code block. This block should contain *only* the prompts themselves, with no numbers, titles, or any other wrapping text.

---

**EXAMPLE USAGE:**

**User provides:** "a new wireless headphone", Instructions: "focus on a tech-savvy, urban audience", Number of prompts: 5

**Your correct output would be:**

**Part 1: Planned Prompts**
1.  **Minimalist Studio Shot:** A clean, e-commerce-ready image focusing on the product's design on a neutral background.
2.  **Urban Lifestyle Scene:** Shows the headphones in a realistic, aspirational user environment to connect with the urban audience.
3.  **Dynamic Action Shot:** A creative, high-energy prompt emphasizing the product's use in a tech-focused setting.
4.  **Detailed Close-Up:** A macro shot to highlight the premium materials and texture of the headphones.
5.  **Luxury Editorial Shot:** A stylized, high-fashion prompt suitable for a magazine or high-end tech blog.

**Part 2: Generated Prompts**
\`\`\`md
Photorealistic studio product shot of sleek matte black wireless headphones on a plain white background, centered with soft studio lighting, subtle shadows for depth, hyper-detailed textures, 8K resolution, sharp focus, professional photography style.
Lifestyle image of a person wearing modern wireless headphones while commuting on a subway, looking out the window at a blurred cityscape, natural light creating soft reflections, moody and focused atmosphere, shallow depth of field, 4K quality.
Dynamic action shot of futuristic wireless headphones floating against a dark, moody background with neon data-stream light trails, dramatic cinematic lighting, energetic and tech-focused aesthetic, hyper-realistic render.
Extreme close-up macro shot of the textured metal finish on the earcup of a premium wireless headphone, highlighting the precision-drilled speaker grille, soft directional lighting, razor-sharp focus, minimalist and tactile.
Editorial fashion photo of elegant graphite wireless headphones placed on a concrete surface next to a minimalist tech magazine, dramatic single-source lighting, sophisticated and aspirational mood, modern tech-aesthetic photography, hyper-detailed.
\`\`\``;

export const ICONS: Record<string, string> = {
    COPY: "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
    IMAGE_COPY: "M2 16H0V2C0 .9.9 0 2 0h14v2H2v14zm18-4V6c0-1.1-.9-2-2-2H6C4.9 4 4 4.9 4 6v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2zM8 12l2.5 3.01L14 11l4 5H6l2-2.5z",
    SPARKLES: "M20 9.69L17.88 8.82 17 6.5l-1.13 2.32L13.57 10l2.32 1.13L17 13.5l.88-2.12L20 9.69zm-3.5-6.07L15.18 5 14 2.5 12.82 5 11.5 6.32l-1.32 1.32L9 9.12 7.68 7.8 6.5 6.5 5.18 9 4 11.5l2.5 1.18L7.8 14l1.32-1.32L10.5 14l1.18 2.5 2.32-1.18L14.88 14l1.32 1.32L17.5 14l1.18-2.5-2.5-1.18L14.82 9l-1.32 1.32L12.5 9l-1.18-2.5z",
    FILTER: "M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z",
    STOP: "M6 6h12v12H6z",
    PLUS: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
    DOWNLOAD: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
    TRASH: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
    FOLDER: "M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z",
    UPLOAD: "M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z",
    CHECK: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    CHEVRON_UP: "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z",
    CHEVRON_DOWN: "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z",
    CHEVRON_LEFT: "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z",
    CHEVRON_RIGHT: "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
    WAND: "M5 3v18h3.03c.53-2.28 2.63-4 5.22-4h.5a4.23 4.23 0 0 1 4.25 4.25V21H21V3H5zm2 2h12v11.54c-1.63-.9-3.5-1.29-5.46-1.29H9.75c-1.97 0-3.84.4-5.46 1.29V5z",
    GRID: "M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z",
    EDIT: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
    PROJECT: "M20 6H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z",
    LOGOUT: "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z",
    SEARCH: "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
    SETTINGS: "M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z",
    UNDO: "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C20.36 11.33 16.79 8 12.5 8z",
    REDO: "M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.29 0-7.86 3.33-8.37 7.5l-2.37.78C1.45 10.31 5.97 6 11.5 6c2.97 0 5.66 1.34 7.5 3.43L21 7v9h-9l3.4-3.4z",
    ADD_REFERENCE: "M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
    FILE: "M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z",
    PEN: "M2.85 18.69l3.39-3.39 2.12 2.12-3.4 3.4a.5.5 0 0 1-.7 0L1.41 18a.5.5 0 0 1 0-.7l2.85-2.85L2.12 12.3 0 14.41V20a2 2 0 0 0 2 2h5.59l-2.12-2.12-2.62-2.19zM18 2.12l-6.2 6.2 2.12 2.12 6.2-6.2L18 2.12zM4.27 15.83l10.6-10.6 2.12 2.12-10.6 10.6-2.12-2.12z",
    RECTANGLE: "M3 5v14h18V5H3zm16 12H5V7h14v10z",
    OVAL: "M12 5C5.93 5 1 8.13 1 12s4.93 7 11 7 11-3.13 11-7-4.93-7-11-7zm0 12c-4.96 0-9-2.24-9-5s4.04-5 9-5 9 2.24 9 5-4.04 5-9 5z",
    CROP: "M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z",
    COFFEE: "M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4v-2z",
    CLOSE: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    KEY: "M12.65 10A5.99 5.99 0 0 0 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 0 0 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z",
    EYE: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
    EYE_OFF: "M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z",
    PHONE: "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",
};