// Fix: Import GenerateImagesResponse to correctly type the API response.
import { GoogleGenAI, GenerateContentResponse, Modality, GenerateImagesResponse, Type } from '@google/genai';
import type { ReferenceImage } from '../types';
import { WIZARD_SYSTEM_PROMPT } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abortHandler = () => {
      reject(new DOMException('Aborted by user', 'AbortError'));
    };

    signal.addEventListener('abort', abortHandler, { once: true });

    promise.then(
      (result) => {
        signal.removeEventListener('abort', abortHandler);
        resolve(result);
      },
      (error) => {
        signal.removeEventListener('abort', abortHandler);
        reject(error);
      }
    );
  });
}


export async function generateImage(
  prompt: string,
  referenceImages: ReferenceImage[],
  aspectRatio: string,
  signal: AbortSignal
): Promise<{ imageUrl?: string; error?: string }> {
  try {
    if (signal.aborted) throw new DOMException('Aborted by user', 'AbortError');

    if (referenceImages.length > 0) {
      const imageParts = referenceImages.map(img => ({
        inlineData: { data: img.base64, mimeType: img.mimeType },
      }));

      const apiPromise = ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            ...imageParts,
            { text: `Using the provided reference image(s) as strong inspiration, generate a new photorealistic image for this request: "${prompt}"` },
          ],
        },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] }
      });
      
      const response: GenerateContentResponse = await withAbort(apiPromise, signal);
      
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return { imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` };
        }
      }
      for (const part of response.candidates[0].content.parts) {
        if(part.text) return { error: `AI responded: "${part.text.substring(0, 150)}..."` };
      }
      return { error: 'Image-to-image generation did not return an image.' };

    } else {
      const apiPromise = ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: { 
            numberOfImages: 1, 
            aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9" 
        },
      });
      // Fix: Explicitly type the response to resolve property access errors.
      const response: GenerateImagesResponse = await withAbort(apiPromise, signal);

      if (response.generatedImages && response.generatedImages.length > 0) {
        return { imageUrl: `data:image/png;base64,${response.generatedImages[0].image.imageBytes}` };
      }
      return { error: 'Text-to-image generation failed to produce an image.' };
    }
  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    console.error('Gemini API Error:', error);
    return { error: error.message || 'An unknown API error occurred.' };
  }
}

export async function magicEditImage(
  base64Image: string,
  mimeType: string,
  prompt: string,
  instructionAssets: { base64: string, mimeType: string }[]
): Promise<{ imageUrl?: string; error?: string }> {
  try {
    const instructionParts = instructionAssets.map(asset => ({
        inlineData: { data: asset.base64, mimeType: asset.mimeType }
    }));

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Image, mimeType: mimeType } },
            ...instructionParts,
            { text: `Edit the first image based on the text instruction and any following instructional images (like markups). Text instruction: "${prompt}"` },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        }
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return { imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` };
        }
    }
    for (const part of response.candidates[0].content.parts) {
      if (part.text) return { error: `AI responded: "${part.text.substring(0, 150)}..."` };
    }
    return { error: "Magic Edit did not return an image." };
  } catch (error: any) {
    console.error('Gemini API Error (magicEditImage):', error);
    return { error: error.message || 'An unknown API error occurred during image editing.' };
  }
}

export async function generatePromptsWithAI(
    userInput: string,
    context: string,
    numPrompts: number
): Promise<{ prompts?: string[]; error?: string }> {
    try {
        const fullWizardPrompt = `User Goal: ${userInput}\n\nContext: ${context || 'None'}\n\nNumber of prompts to generate: ${numPrompts}`;
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullWizardPrompt,
            config: {
                systemInstruction: WIZARD_SYSTEM_PROMPT,
            }
        });

        const text = response.text;
        if (text) {
            const promptBlockRegex = /```(?:md)?\s*([\s\S]+?)\s*```/;
            const match = text.match(promptBlockRegex);
            const content = match ? match[1] : text;
            const newPrompts = content.split('\n').map(p => p.trim()).filter(p => p.length > 0 && !p.startsWith('#'));
            return { prompts: newPrompts };
        }
        return { error: "AI did not return any prompts." };

    } catch (error: any) {
        console.error('Gemini API Error (generatePromptsWithAI):', error);
        return { error: error.message || 'An unknown API error occurred while generating prompts.' };
    }
}

// New Advanced Tool Functions

export async function detectObjectsInImage(
    base64Image: string,
    mimeType: string,
): Promise<{ detections?: any[]; error?: string }> {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { inlineData: { data: base64Image, mimeType } },
                    { text: "Detect all objects in the image. For each object, provide its name and a bounding box as an array of four numbers [x_min, y_min, x_max, y_max] in normalized coordinates (0.0 to 1.0)." }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        detections: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    label: { type: Type.STRING },
                                    box: {
                                        type: Type.ARRAY,
                                        items: { type: Type.NUMBER }
                                    }
                                }
                            }
                        }
                    }
                },
            }
        });
        const json = JSON.parse(response.text);
        return { detections: json.detections };

    } catch (error: any) {
        console.error('Gemini API Error (detectObjectsInImage):', error);
        return { error: error.message || 'An unknown API error occurred during object detection.' };
    }
}

export async function extendImage(
    base64Image: string,
    mimeType: string,
): Promise<{ imageUrl?: string; error?: string }> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: base64Image, mimeType: mimeType } },
                    { text: "This image has been placed on a larger transparent canvas. Fill in the transparent areas to extend the image naturally and seamlessly, maintaining the existing style and lighting. This is an outpainting task." },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            }
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return { imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` };
            }
        }
        return { error: "Image extension (outpainting) did not return an image." };
    } catch (error: any) {
        console.error('Gemini API Error (extendImage):', error);
        return { error: error.message || 'An unknown API error occurred during image extension.' };
    }
}

export async function upscaleImage(
    base64Image: string,
    mimeType: string,
): Promise<{ imageUrl?: string; error?: string }> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: base64Image, mimeType: mimeType } },
                    { text: "Upscale this image to 4 times its original resolution. Add realistic details, textures, and clarity while preserving the original composition and style. The output should be a high-resolution, photorealistic version of the input." },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            }
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return { imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` };
            }
        }
        return { error: "Image upscaling did not return an image." };
    } catch (error: any) {
        console.error('Gemini API Error (upscaleImage):', error);
        return { error: error.message || 'An unknown API error occurred during upscaling.' };
    }
}