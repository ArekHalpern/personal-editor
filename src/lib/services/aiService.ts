import OpenAI from "openai";
import { useSettings } from "../stores/settings";
import { v4 as uuidv4 } from 'uuid';

interface ChatRequest {
  message: string;
  lineMetadata: Array<{
    content: string;
    type: string;
    id: string;
    number: number;
    timestamp: number;
    lastModified: number;
    aiEnhanced: boolean;
  }>;
  selectedText?: string;
  fullContent: string;
  filename: string;
}

interface ChatResponse {
  message: string;
  enhancedText?: {
    lines: Array<{
      content: string;
      type: string;
      id: string;
      number: number;
      timestamp: number;
      lastModified: number;
      aiEnhanced: boolean;
    }>;
  };
}

class AIService {
  private openai: OpenAI | null = null;

  private getClient() {
    const settings = useSettings.getState().settings;
    const apiKey = settings.api.openai.apiKey;
    
    console.log('Settings state:', {
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey ? apiKey.slice(0, 7) : 'none',
      availableModels: settings.api.openai.models,
      selectedModel: settings.api.openai.selectedModel
    });
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add your API key in settings.');
    }

    if (!this.openai || this.openai.apiKey !== apiKey) {
      console.log('Creating new OpenAI client with updated API key');
      this.openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true // Required for client-side usage
      });
    }

    return this.openai;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const client = this.getClient();
    const settings = useSettings.getState().settings;
    const model = settings.api.openai.selectedModel || settings.api.openai.models[0];
    
    console.log('Making API request with:', {
      model,
      messageLength: request.message.length,
      filename: request.filename
    });

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: this.getSystemPrompt(request.filename)
        },
        {
          role: "user",
          content: `Request: "${request.message}"\n\n` +
            `Filename: ${request.filename}\n\n` +
            `Document Content:\n${request.fullContent}\n\n` +
            `${request.selectedText ? `Selected Text:\n${request.selectedText}\n\n` : ''}` +
            `Lines to Consider:\n${JSON.stringify(request.lineMetadata, null, 2)}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const response = JSON.parse(completion.choices[0].message.content || '{"message":"Unable to process request"}');
    
    // Add IDs and timestamps to new lines if they exist
    if (response.enhancedText?.lines) {
      const now = Date.now();
      response.enhancedText.lines = response.enhancedText.lines.map((line: any, index: number) => ({
        ...line,
        id: uuidv4(),
        number: index + 1,
        timestamp: now,
        lastModified: now,
        aiEnhanced: true
      }));
    }

    return response;
  }

  private getSystemPrompt(filename: string): string {
    return `You are a precise document editor working on "${filename}". 
Your task is to analyze and enhance the provided content while maintaining context and style.

Rules:
1. Keep changes minimal and focused
2. Preserve the original meaning
3. Maintain consistent style
4. Never include HTML tags
5. Always use paragraphs, never headers or lists
6. Only change content, not structure

Respond in JSON format with:
{
  "message": "Description of changes or analysis",
  "enhancedText": {
    "lines": [
      {
        "content": "Line content",
        "type": "paragraph"
      }
    ]
  }
}`;
  }
}

export const aiService = new AIService(); 