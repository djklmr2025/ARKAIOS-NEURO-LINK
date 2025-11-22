import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, MessageRole } from "../types";

// Initialize Gemini Client
// NOTE: process.env.API_KEY is injected by the runtime environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `
You are the Arkaios Neural Agent (ANA). 
You are a highly advanced AI integrated into the user's digital environment.
Your primary function is to analyze visual data (screen context) and assist with complex tasks.
Maintain a concise, technical, and helpful tone. 
When analyzing screenshots, be extremely specific about UI elements, code snippets, or text visible.
If the user provides a code snippet in the image, provide the solution or refactor in text.
`;

/**
 * Sends a multimodal prompt to Gemini 2.5 Flash
 */
export const sendNeuralMessage = async (
  history: Message[], 
  currentPrompt: string, 
  imageBase64?: string
): Promise<string> => {
  
  try {
    const model = 'gemini-2.5-flash'; // Best for speed and multimodal tasks

    // Prepare content parts
    const parts: any[] = [];

    // If there is an image (Screen capture), add it first
    if (imageBase64) {
      // Strip prefix if present (e.g., "data:image/png;base64,")
      const base64Data = imageBase64.split(',')[1] || imageBase64;
      
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: base64Data
        }
      });
    }

    // Add the text prompt
    parts.push({
      text: currentPrompt
    });

    // We simplify history for this specific "Neural Agent" implementation 
    // to focus on the immediate context (Vision) + Prompt. 
    // For a full chat app, we would map previous history. 
    // Here we append the last few messages to the prompt context if needed, 
    // but standard GenerateContent is stateless unless using Chats.
    // For vision tasks, stateless request with context is often safer/cheaper.
    
    let contextPrompt = currentPrompt;
    if (history.length > 0) {
       const recentHistory = history.slice(-3).map(h => `${h.role}: ${h.text}`).join('\n');
       contextPrompt = `Context:\n${recentHistory}\n\nCurrent Task: ${currentPrompt}`;
       // Update the text part
       parts[parts.length - 1].text = contextPrompt;
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: {
        role: 'user',
        parts: parts
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    });

    if (response.text) {
      return response.text;
    } else {
      return "Neural link established, but no textual response was generated.";
    }

  } catch (error: any) {
    console.error("Arkaios Neural Link Error:", error);
    return `Error connecting to Neural Backend: ${error.message || 'Unknown error'}`;
  }
};