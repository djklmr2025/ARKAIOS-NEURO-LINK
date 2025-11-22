import { GoogleGenAI, GenerateContentResponse, FunctionDeclaration, Type } from "@google/genai";
import { Message } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `
You are the Arkaios Neural Agent (ANA).
You are an advanced AI integrated into the user's local environment via the Arkaios Protocol.

**CAPABILITIES:**
1. **VISION:** You can see the user's screen when provided with screenshots. Analyze them in extreme technical detail.
2. **FILE SYSTEM:** You have direct access to the user's mounted local workspace. You can READ, WRITE, CREATE, and LIST files.
   - ALWAYS check the file structure using 'list_files' before trying to read specific files if you are unsure of the path.
   - When asked to "create a website" or "write code", IMMEDIATELY use the 'write_file' tool to save the code to the user's disk.
   - Do not just print code in the chat if you can save it to a file.

**TONE:**
Mainframe-style, efficient, professional, and highly technical. You are an Operating System Agent.
`;

// --- TOOL DEFINITIONS ---

const listFilesTool: FunctionDeclaration = {
  name: 'list_files',
  description: 'List all files and directories in the root of the mounted workspace.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const readFileTool: FunctionDeclaration = {
  name: 'read_file',
  description: 'Read the text content of a file from the workspace.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      fileName: {
        type: Type.STRING,
        description: 'The name/path of the file to read (e.g., "index.html" or "src/app.js")',
      },
    },
    required: ['fileName'],
  },
};

const writeFileTool: FunctionDeclaration = {
  name: 'write_file',
  description: 'Create or Overwrite a file in the workspace with specific content.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      fileName: {
        type: Type.STRING,
        description: 'The name/path of the file to write.',
      },
      content: {
        type: Type.STRING,
        description: 'The full string content to write into the file.',
      },
    },
    required: ['fileName', 'content'],
  },
};

const fileSystemTools = [listFilesTool, readFileTool, writeFileTool];

/**
 * Sends a multimodal prompt to Gemini 2.5 Flash with Tools
 */
export const sendNeuralMessage = async (
  history: Message[], 
  currentPrompt: string | null, 
  imageBase64?: string,
  toolResponses?: any[]
): Promise<GenerateContentResponse> => {
  
  try {
    const model = 'gemini-2.5-flash';

    // Prepare content parts
    const parts: any[] = [];

    // 1. If this is a Tool Response (recursive call), add the function responses
    if (toolResponses && toolResponses.length > 0) {
        parts.push(...toolResponses);
    } 
    // 2. Normal User Message
    else {
        // Vision Input
        if (imageBase64) {
            const base64Data = imageBase64.split(',')[1] || imageBase64;
            parts.push({
                inlineData: {
                mimeType: 'image/png',
                data: base64Data
                }
            });
        }
        // Text Input
        if (currentPrompt) {
             parts.push({ text: currentPrompt });
        }
    }

    // History Context (Simplified for stateless REST calls)
    // We inject the last few interactions as "Text" context to give the model memory
    // without managing full ChatSession complexity for tools in this snippet.
    let systemContext = "";
    if (history.length > 0 && !toolResponses) {
       const recent = history.slice(-4).filter(m => m.text).map(h => `[${h.role.toUpperCase()}]: ${h.text}`).join('\n');
       systemContext = `PREVIOUS CONTEXT:\n${recent}\n\nCURRENT REQUEST:\n`;
       // Prepend context to the user text part if it exists
       const textPart = parts.find(p => p.text);
       if (textPart) {
           textPart.text = systemContext + textPart.text;
       } else if (parts.length > 0) {
           parts.push({ text: systemContext + " (See attached image)" });
       }
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: {
        role: toolResponses ? 'function' : 'user', // 'function' role isn't standard in top-level contents, but 'parts' handles it
        parts: parts
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4, // Lower temperature for precise file operations
        tools: [{ functionDeclarations: fileSystemTools }],
      }
    });

    return response;

  } catch (error: any) {
    console.error("Arkaios Neural Link Error:", error);
    throw error;
  }
};