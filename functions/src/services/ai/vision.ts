import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEnvConfig } from '../../config/env';

const config = getEnvConfig();

/**
 * Vision AI Provider using Google Gemini 1.5 Pro
 * Analyzes product images for marketing campaign generation
 */
export class GeminiVisionProvider {
  private client: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = config.GEMINI_API_KEY || '';
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: 'gemini-1.5-pro' });
  }

  /**
   * Analyze product images for marketing campaign
   */
  async analyzeProductImages(
    imageUrls: string[],
    productMetadata: {
      name: string;
      description?: string;
      price: number;
      category: string;
    },
    businessContext: {
      name: string;
      category: string;
      location: { city: string; state: string; locality?: string };
    }
  ): Promise<VisionAnalysisResult> {
    const imageParts = await this.prepareImages(imageUrls);

    const prompt = this.buildAnalysisPrompt(productMetadata, businessContext);

    try {
      const result = await this.model.generateContent([prompt, ...imageParts]);
      const response = result.response.text();

      return this.parseVisionResponse(response);
    } catch (error) {
      throw new Error(
        `Vision analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Prepare images for Gemini API
   */
  private async prepareImages(imageUrls: string[]): Promise<any[]> {
    const parts = [];
    for (const url of imageUrls) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = response.headers.get('content-type') || 'image/jpeg';

        parts.push({
          inlineData: {
            mimeType,
            data: base64,
          },
        });
      } catch (error) {
        console.warn(`Failed to load image ${url}:`, error);
      }
    }
    return parts;
  }

  /**
   * Build the analysis prompt for product images
   */
  private buildAnalysisPrompt(
    productMetadata: {
      name: string;
      description?: string;
      price: number;
      category: string;
    },
    businessContext: {
      name: string;
      category: string;
      location: { city: string; state: string; locality?: string };
    }
  ): string {
    return `You are an expert food/product analyst for Indian restaurant marketing campaigns. Analyze the provided product images and return a detailed structured analysis.

BUSINESS CONTEXT:
- Business: ${businessContext.name}
- Category: ${businessContext.category}
- Location: ${businessContext.location.city}, ${businessContext.location.state}${businessContext.location.locality ? ` (${businessContext.location.locality})` : ''}

PRODUCT METADATA:
- Name: ${productMetadata.name}
- Description: ${productMetadata.description || 'Not provided'}
- Category: ${productMetadata.category}
- Price: ₹${productMetadata.price}

ANALYSIS REQUIRED:
Return a JSON object with the following structure:

{
  "dishName": "string - Identified dish name from images",
  "confidence": "number - Confidence score 0-1",
  "visualAttributes": {
    "platingStyle": "string - e.g., copper handi, banana leaf, white plate, bowl",
    "container": "string - Type of container",
    "garnish": ["string - Array of visible garnishes"],
    "colorPalette": ["string - Dominant colors"],
    "lighting": "string - natural/warm/studio/dim",
    "background": "string - kitchen/table/blurred/clean",
    "portionSize": "small|medium|large|family",
    "steamVisible": "boolean",
    "textureCues": ["string - e.g., crispy, juicy, creamy, fluffy"]
  },
  "ambianceCues": ["string - Environmental cues like restaurant setting, lighting mood"],
  "suggestedCompositions": ["string - 3-5 suggested photo compositions for marketing"],
  "qualityFlags": ["string - Issues like blur, overexposure, clutter, bad angle"]
}

Be specific and descriptive for image prompt generation. Focus on visual details that would help create appetizing marketing creatives.`;
  }

  /**
   * Parse the vision response from Gemini
   */
  private parseVisionResponse(response: string): VisionAnalysisResult {
    try {
      // Extract JSON from response (Gemini might include markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      return JSON.parse(jsonStr);
    } catch (error) {
      throw new Error(
        `Failed to parse vision response: ${error instanceof Error ? error.message : 'Invalid JSON'}`
      );
    }
  }
}

export interface VisionAnalysisResult {
  dishName: string;
  confidence: number;
  visualAttributes: {
    platingStyle: string;
    container: string;
    garnish: string[];
    colorPalette: string[];
    lighting: string;
    background: string;
    portionSize: 'small' | 'medium' | 'large' | 'family';
    steamVisible: boolean;
    textureCues: string[];
  };
  ambianceCues: string[];
  suggestedCompositions: string[];
  qualityFlags: string[];
}

// Export singleton instance
export const geminiVisionProvider = new GeminiVisionProvider();
