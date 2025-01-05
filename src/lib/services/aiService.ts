import OpenAI from "openai";
import { useSettings } from "../stores/settings";
import { v4 as uuidv4 } from 'uuid';
import { LineMetadata } from "../types/editor";
import { 
  AssistantResponse, 
  EditOperation, 
  AnalyzeTextResponse, 
  DeleteTextResponse,
  EnhanceRequest,
  EnhanceResponse,
  GenerateFileRequest,
  GenerateFileResponse,
  FileGenerationCollectedInfo
} from '../types/assistant';
import { parseCommand } from '../utils/commandParser';
import { FileService } from "../utils/filesystem/fileService";

interface ChatRequest {
  message: string;
  lineMetadata: LineMetadata[];
  selectedText?: string;
  fullContent: string;
  filename: string;
  context?: {
    fileGenerationState?: {
      inProgress: boolean;
      collectedInfo?: FileGenerationCollectedInfo;
    };
  };
}

interface ChatResponse {
  message: string;
  enhancedText?: {
    lines: LineMetadata[];
  };
  analysis?: {
    filename: string;
    summary: string;
    purpose: string;
    keyComponents: string[];
    technicalDetails: string;
  };
  error?: boolean;
  fileGeneration?: {
    shouldGenerate: boolean;
    collectedInfo?: {
      filename?: string;
      description?: string;
      outline?: string;
      requirements?: string[];
    };
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
        dangerouslyAllowBrowser: true
      });
    }

    return this.openai;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const client = this.getClient();
    const settings = useSettings.getState().settings;
    const model = settings.api.openai.selectedModel || settings.api.openai.models[0];

    // Check if this is a file generation request
    const isFileGenerationRequest = this.isFileGenerationRequest(request.message);
    const isInFileGenerationFlow = request.context?.fileGenerationState?.inProgress;

    if (isFileGenerationRequest || isInFileGenerationFlow) {
      return this.handleFileGenerationChat(request);
    }

    // Log initial line metadata
    console.log('📊 Initial Line Metadata:', {
      totalLines: request.lineMetadata.length,
      emptyLines: request.lineMetadata.filter(l => !l.content.trim().length).length,
      contentLines: request.lineMetadata.filter(l => l.content.trim().length > 0).length,
      lineDetails: request.lineMetadata.map(l => ({
        number: l.number,
        content: l.content,
        isEmpty: !l.content.trim().length,
        type: l.type
      }))
    });

    console.log('🤖 AI Request:', {
      model,
      message: request.message,
      filename: request.filename,
      selectedText: request.selectedText,
      lineCount: request.lineMetadata.length,
      timestamp: new Date().toISOString()
    });

    // Parse the command to determine operation
    const command = parseCommand(request.message);
    console.log('Parsed Command:', command);

    // Get target lines based on command
    const targetLines = this.getTargetLines(command, request.lineMetadata, request.selectedText);

    // Analyze document structure
    const spacingPattern = this.analyzeSpacingPattern(request.lineMetadata);
    console.log('📏 Document Structure Analysis:', {
      pattern: spacingPattern,
      sampleLines: request.lineMetadata.slice(0, 5).map(l => ({
        number: l.number,
        content: l.content,
        isEmpty: !l.content.trim().length
      })),
      totalEmptyLines: request.lineMetadata.filter(l => !l.content.trim().length).length
    });

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: this.getSystemPrompt(command.operation, request.filename, command.isFileQuery)
      },
      {
        role: "user",
        content: `Request: "${request.message}"\n\n` +
          `Filename: ${request.filename}\n\n` +
          `Document Structure: ${spacingPattern}\n\n` +
          `Document Content:\n${request.fullContent}\n\n` +
          `${request.selectedText ? `Selected Text:\n${request.selectedText}\n\n` : ''}` +
          `Lines to Consider (including spacing):\n${JSON.stringify(targetLines, null, 2)}`
      }
    ];

    console.log('📤 OpenAI Messages:', messages);

    const completion = await client.chat.completions.create({
      model,
      messages,
      response_format: { type: "json_object" }
    });

    console.log('📥 OpenAI Raw Response:', completion.choices[0].message);

    const response = JSON.parse(completion.choices[0].message.content || '{"message":"Unable to process request"}') as AssistantResponse;
    
    console.log('🔄 Parsed Response:', {
      operation: response.operation,
      message: response.message,
      hasEnhancements: 'changes' in response || 'newLines' in response,
      timestamp: new Date().toISOString()
    });
    
    return this.processResponse(response, request.lineMetadata);
  }

  async enhance(request: EnhanceRequest): Promise<EnhanceResponse> {
    const client = this.getClient();
    const settings = useSettings.getState().settings;
    const model = settings.api.openai.selectedModel || settings.api.openai.models[0];

    console.log('🤖 Enhancement Request:', {
      selectedText: request.selectedText,
      prompt: request.prompt,
      context: request.context,
      filename: request.filename,
      timestamp: new Date().toISOString()
    });

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: this.getEnhanceSystemPrompt()
      },
      {
        role: "user",
        content: `Selected text: "${request.selectedText}"
        
Enhancement prompt: "${request.prompt}"
${request.context ? `Context: ${request.context}` : ''}
${request.filename ? `File: ${request.filename}` : ''}`
      }
    ];

    console.log('📤 OpenAI Messages:', messages);

    const completion = await client.chat.completions.create({
      model,
      messages,
      response_format: { type: "json_object" }
    });

    console.log('📥 OpenAI Raw Response:', completion.choices[0].message);

    const response = JSON.parse(completion.choices[0].message.content || '{}') as EnhanceResponse;
    
    console.log('🔄 Enhancement Response:', {
      hasEnhancedText: !!response.enhancedText,
      explanation: response.explanation,
      changeCount: response.changes?.length || 0,
      timestamp: new Date().toISOString()
    });

    return response;
  }

  async generateFile(request: GenerateFileRequest): Promise<GenerateFileResponse> {
    const client = this.getClient();
    const settings = useSettings.getState().settings;
    const model = settings.api.openai.selectedModel || settings.api.openai.models[0];

    console.log("📤 Generating new file with request:", {
      model,
      request,
      timestamp: new Date().toISOString()
    });

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: this.getSystemPrompt('generate_file', request.filename)
      },
      {
        role: "user",
        content: `Please create a new file named "${request.filename}".
          Description of desired content: "${request.description}"
          Additional outline/context: "${request.outline || "N/A"}"

          Provide the final JSON response with filename, content, and a short message.`
      }
    ];

    try {
      const completion = await client.chat.completions.create({
        model,
        messages,
        response_format: { type: "json_object" }
      });

      console.log("📥 Raw AI response:", completion.choices[0].message);

      const result = JSON.parse(
        completion.choices[0].message.content || '{"error":true,"message":"No valid response"}'
      ) as GenerateFileResponse;

      if (!result.content || !result.filename) {
        throw new Error("Invalid AI response; missing content or filename field.");
      }

      return {
        operation: 'generate_file',
        filename: result.filename,
        content: result.content,
        message: result.message || `Generated file: ${result.filename}`
      };
    } catch (error: any) {
      console.error("Error generating file:", error);
      throw error;
    }
  }

  private getSystemPrompt(operation: EditOperation, filename: string, isFileQuery?: boolean): string {
    const basePrompt = `You are a precise document editor working on "${filename}". `;
    const responseFormat = 'Respond in JSON format following the specified structure for each operation type.\n\nIMPORTANT: Always use type: "paragraph" for all content. Never use headers or list items.\n\nIMPORTANT: Pay attention to empty lines (content: " ") in the document. These represent intentional spacing between content lines. Maintain the same spacing pattern when adding or modifying content.';
    
    const operationPrompts: Record<EditOperation, string> = {
      'inline_edit': basePrompt + 
        'Your task is to edit the specified content inline while maintaining context and style.\n\n' +
        'Rules:\n' +
        '1. Keep changes minimal and focused\n' +
        '2. Preserve the original meaning\n' +
        '3. Maintain consistent style\n' +
        '4. Never include HTML tags\n' +
        '5. Always use paragraphs, never headers or lists\n' +
        '6. Only change content, not structure\n\n' +
        responseFormat + '\n' +
        'JSON Response Structure:\n' +
        '{\n' +
        '  "operation": "inline_edit",\n' +
        '  "message": "Description of changes",\n' +
        '  "changes": [{ "lineNumber": number, "content": string, "type": "paragraph" }]\n' +
        '}',

      'multi_line_edit': basePrompt +
        'Your task is to edit multiple lines while maintaining document coherence.\n\n' +
        'Rules:\n' +
        '1. Keep the same number of lines\n' +
        '2. Preserve line numbers and relationships\n' +
        '3. Maintain document flow\n' +
        '4. Never include HTML tags\n' +
        '5. Always use paragraphs, never headers or lists\n' +
        '6. Only change content, not structure\n\n' +
        responseFormat + '\n' +
        'JSON Response Structure:\n' +
        '{\n' +
        '  "operation": "multi_line_edit",\n' +
        '  "message": "Description of changes",\n' +
        '  "changes": [{ "lineNumber": number, "content": string, "type": "paragraph" }]\n' +
        '}',

      'continue_text': basePrompt +
        'Your task is to continue the document naturally after the specified point.\n\n' +
        'Rules:\n' +
        '1. Match existing style and tone\n' +
        '2. Add meaningful content\n' +
        '3. Maintain natural flow\n' +
        '4. Never include HTML tags\n' +
        '5. Always use paragraphs, never headers or lists\n' +
        '6. IMPORTANT: When a specific number of lines is requested (e.g., "add 5 lines"), you MUST generate exactly that number of CONTENT lines\n' +
        '7. IMPORTANT: Maintain the document\'s spacing pattern. If you see empty lines (content: " ") between content lines, include them in your response\n\n' +
        responseFormat + '\n' +
        'JSON Response Structure:\n' +
        '{\n' +
        '  "operation": "continue_text",\n' +
        '  "message": "Description of continuation",\n' +
        '  "newLines": [{ "content": string, "type": "paragraph" }],\n' +
        '  "afterLine": number\n' +
        '}',

      'summarize_text': basePrompt +
        'Your task is to provide a concise summary of the document.\n\n' +
        'Rules:\n' +
        '1. Capture key points\n' +
        '2. Keep it brief but comprehensive\n' +
        '3. Maintain factual accuracy\n' +
        '4. Never include HTML tags\n\n' +
        responseFormat + '\n' +
        'JSON Response Structure:\n' +
        '{\n' +
        '  "operation": "summarize_text",\n' +
        '  "message": "Summary generated",\n' +
        '  "summary": string\n' +
        '}',

      'analyze_text': basePrompt +
        (isFileQuery 
          ? 'Your task is to analyze and explain this file\'s content and purpose.\n\n' +
            'Rules:\n' +
            '1. Always start by identifying the filename and its significance\n' +
            '2. Explain what this file is and its main purpose\n' +
            '3. Describe how it fits into the larger system\n' +
            '4. Highlight key functionality and features\n' +
            '5. Explain technical concepts in simple terms\n\n'
          : 'Your task is to analyze and explain the selected content.\n\n' +
            'Rules:\n' +
            '1. Provide a clear, concise explanation of the content\n' +
            '2. Identify the main purpose and key components\n' +
            '3. Explain technical concepts in simple terms\n' +
            '4. If it\'s code, explain its functionality\n\n'
        ) +
        responseFormat + '\n' +
        'JSON Response Structure:\n' +
        '{\n' +
        '  "operation": "analyze_text",\n' +
        '  "message": "Content Analysis",\n' +
        '  "analysis": {\n' +
        '    "filename": string,\n' +
        '    "summary": string,\n' +
        '    "purpose": string,\n' +
        '    "keyComponents": string[],\n' +
        '    "technicalDetails": string\n' +
        '  }\n' +
        '}',

      'delete_text': basePrompt +
        'Your task is to identify and delete specified lines from the document.\n\n' +
        'Rules:\n' +
        '1. Only delete explicitly requested lines\n' +
        '2. Verify line numbers are valid\n' +
        '3. Maintain document coherence after deletion\n\n' +
        responseFormat + '\n' +
        'JSON Response Structure:\n' +
        '{\n' +
        '  "operation": "delete_text",\n' +
        '  "message": "Description of deletion",\n' +
        '  "linesToDelete": number[]\n' +
        '}',

      'generate_file': basePrompt +
        'Your task is to generate a complete, well-structured file based on the user\'s description.\n\n' +
        'Rules:\n' +
        '1. Create appropriate content that matches the requested file type\n' +
        '2. Include all necessary sections and components\n' +
        '3. Follow best practices for the file type\n' +
        '4. Ensure the content is complete and self-contained\n' +
        '5. Add appropriate comments and documentation\n\n' +
        responseFormat + '\n' +
        'JSON Response Structure:\n' +
        '{\n' +
        '  "operation": "generate_file",\n' +
        '  "message": "Description of the generated file",\n' +
        '  "filename": string,\n' +
        '  "content": string\n' +
        '}'
    };

    return operationPrompts[operation];
  }

  private getEnhanceSystemPrompt(): string {
    return `You are an expert text editor and enhancer. Your task is to modify the provided text according to the user's prompt while maintaining:
1. Consistent style and tone
2. Proper grammar and punctuation
3. Natural flow and readability
4. Original meaning unless explicitly asked to change it

Provide your response in JSON format with:
- enhancedText: The modified text
- explanation: Brief explanation of changes made
- changes: Array of modifications made, each with type and description

Rules:
- Only modify what's necessary to fulfill the prompt
- Preserve formatting unless asked to change it
- Ensure the enhanced text can be seamlessly integrated back into the document
- If the prompt is unclear, make minimal, safe improvements
- Keep the same general length unless explicitly asked to expand/shorten`;
  }

  private getTargetLines(
    command: ReturnType<typeof parseCommand>,
    lineMetadata: LineMetadata[],
    selectedText?: string
  ): LineMetadata[] {
    let targetLines: LineMetadata[] = [];

    if (selectedText) {
      targetLines = lineMetadata.filter(line => selectedText.includes(line.content));
    } else if (command.lineNumbers?.length) {
      targetLines = lineMetadata.filter(line => command.lineNumbers?.includes(line.number));
    } else if (command.operation === 'continue_text' && typeof command.afterLine === 'number' && command.afterLine >= 0) {
      // For continue_text, include more context to show the spacing pattern
      const contextStart = Math.max(0, command.afterLine - 4);
      const afterLine = command.afterLine; // Create a stable reference
      targetLines = lineMetadata.filter(line => 
        line.number >= contextStart && line.number <= afterLine
      );
    } else {
      targetLines = lineMetadata;
    }

    // Add a note about spacing pattern
    const spacingPattern = this.analyzeSpacingPattern(targetLines);
    console.log('📏 Document Spacing Pattern:', spacingPattern);

    return targetLines;
  }

  private analyzeSpacingPattern(lines: LineMetadata[]): string {
    let pattern = '';
    let hasEmptyLines = false;
    let consistentSpacing = true;
    let lastContentLine = -1;

    lines.forEach((line, index) => {
      const isEmptyLine = line.content.trim().length === 0;
      if (isEmptyLine) {
        hasEmptyLines = true;
      } else {
        if (lastContentLine !== -1) {
          const spacing = index - lastContentLine - 1;
          if (pattern === '') {
            pattern = `${spacing}`;
          } else if (pattern !== `${spacing}`) {
            consistentSpacing = false;
          }
        }
        lastContentLine = index;
      }
    });

    return hasEmptyLines 
      ? (consistentSpacing 
          ? `Consistent spacing: ${pattern} empty line(s) between content`
          : 'Variable spacing between content')
      : 'No empty lines between content';
  }

  private processResponse(
    response: AssistantResponse,
    lineMetadata: LineMetadata[]
  ): ChatResponse {
    const now = new Date();

    console.log('🔄 Processing Response:', {
      operation: response.operation,
      originalLines: lineMetadata.length,
      originalEmptyLines: lineMetadata.filter(l => !l.content.trim().length).length,
      responseDetails: response
    });

    switch (response.operation) {
      case 'continue_text':
        // Extract number from message if it exists (e.g., "add 5 lines")
        const requestedLines = parseInt(response.message.match(/add (\d+) lines?/i)?.[1] || '0');
        
        // If a specific number was requested but not met, return an error
        if (requestedLines > 0 && response.newLines.length !== requestedLines) {
          return {
            message: `Error: Requested ${requestedLines} lines but received ${response.newLines.length}. Please try again.`,
            error: true
          };
        }

        // Create new lines with spacing
        const newLines = [];
        response.newLines.forEach((line, index) => {
          // Add an empty line before content (except for first line if it should connect to previous content)
          if (index === 0 && lineMetadata.length > 0) {
            const lastContentLine = [...lineMetadata].reverse().find(l => l.content.trim().length > 0);
            const lastLineHasContent = lastContentLine && lastContentLine.number === response.afterLine;
            
            console.log('📍 Processing First Line:', {
              lastContentLine: lastContentLine ? {
                number: lastContentLine.number,
                content: lastContentLine.content,
                isEmpty: !lastContentLine.content.trim().length
              } : null,
              lastLineHasContent,
              willAddSpacing: !lastLineHasContent
            });

            if (!lastLineHasContent) {
              newLines.push({
                content: ' ',
                type: 'paragraph',
                id: uuidv4(),
                number: response.afterLine + newLines.length + 1,
                timestamp: now,
                lastModified: now,
                aiEnhanced: false
              } as LineMetadata);
            }
          } else if (index > 0) {
            // Add spacing between new content lines
            newLines.push({
              content: ' ',
              type: 'paragraph',
              id: uuidv4(),
              number: response.afterLine + newLines.length + 1,
              timestamp: now,
              lastModified: now,
              aiEnhanced: false
            } as LineMetadata);
          }

          // Add the content line
          newLines.push({
            content: line.content.replace(/<[^>]*>/g, ''),
            type: line.type,
            id: uuidv4(),
            number: response.afterLine + newLines.length + 1,
            timestamp: now,
            lastModified: now,
            aiEnhanced: true,
            aiMetadata: {
              lastEnhanced: now,
              enhancementPrompt: response.message
            }
          } as LineMetadata);
        });

        // Add final spacing line if there are more content lines after
        const hasContentAfter = lineMetadata.some(line => 
          line.number > response.afterLine && line.content.trim().length > 0
        );
        
        console.log('📍 Final Spacing Check:', {
          hasContentAfter,
          afterLine: response.afterLine,
          linesAfter: lineMetadata.filter(l => l.number > response.afterLine).map(l => ({
            number: l.number,
            content: l.content,
            isEmpty: !l.content.trim().length
          }))
        });

        if (hasContentAfter) {
          newLines.push({
            content: ' ',
            type: 'paragraph',
            id: uuidv4(),
            number: response.afterLine + newLines.length + 1,
            timestamp: now,
            lastModified: now,
            aiEnhanced: false
          } as LineMetadata);
        }

        const continuedLines = lineMetadata.map(line => ({
          ...line,
          number: line.number > response.afterLine ? line.number + newLines.length : line.number
        }));

        const result = {
          message: response.message,
          enhancedText: { lines: [...continuedLines, ...newLines] }
        };

        console.log('✨ Final Result:', {
          totalLines: result.enhancedText.lines.length,
          emptyLines: result.enhancedText.lines.filter(l => !l.content.trim().length).length,
          contentLines: result.enhancedText.lines.filter(l => l.content.trim().length > 0).length,
          newLinesAdded: newLines.length,
          sampleLines: result.enhancedText.lines.slice(0, 5).map(l => ({
            number: l.number,
            content: l.content,
            isEmpty: !l.content.trim().length
          }))
        });

        return result;

      case 'summarize_text':
        return {
          message: response.summary,
          enhancedText: undefined
        };

      case 'analyze_text':
        const analysis = response as AnalyzeTextResponse;
        let analysisMessage = 'Content Analysis:\n\n';
        
        if (analysis.analysis.filename) {
          analysisMessage += `File: ${analysis.analysis.filename}\n\n`;
        }
        
        analysisMessage += analysis.analysis.summary + '\n\n';
        analysisMessage += `Purpose: ${analysis.analysis.purpose}\n\n`;
        
        if (analysis.analysis.keyComponents.length > 0) {
          analysisMessage += 'Key Components:\n';
          analysis.analysis.keyComponents.forEach((component: string, index: number) => {
            analysisMessage += `${index + 1}. ${component}\n`;
          });
          analysisMessage += '\n';
        }

        if (analysis.analysis.technicalDetails) {
          analysisMessage += `Technical Details:\n${analysis.analysis.technicalDetails}`;
        }

        return {
          message: analysisMessage,
          analysis: analysis.analysis,
          enhancedText: undefined
        };

      case 'delete_text':
        const deleteResponse = response as DeleteTextResponse;
        // Filter out deleted lines and empty lines in one pass
        const remainingLines = lineMetadata
          .filter(line => 
            !deleteResponse.linesToDelete.includes(line.number) && 
            line.content && 
            line.content.trim().length > 0
          )
          .map((line, idx) => ({
            ...line,
            number: idx + 1, // Renumber remaining lines
            type: line.type || 'paragraph' // Ensure valid type
          }));

        // If no lines remain, ensure at least one paragraph
        if (remainingLines.length === 0) {
          remainingLines.push({
            id: uuidv4(),
            number: 1,
            content: ' ',
            type: 'paragraph',
            timestamp: now,
            lastModified: now
          } as LineMetadata);
        }

        return {
          message: response.message,
          enhancedText: { lines: remainingLines }
        };

      default:
        return {
          message: "Unable to process the request",
          enhancedText: undefined
        };
    }
  }

  private isFileGenerationRequest(message: string): boolean {
    const fileGenerationKeywords = [
      /help.*write.*(?:prd|spec|document|doc)/i,
      /create.*(?:prd|spec|document|doc)/i,
      /generate.*(?:prd|spec|document|doc)/i,
      /need.*(?:prd|spec|document|doc)/i
    ];

    return fileGenerationKeywords.some(pattern => pattern.test(message));
  }

  private async handleFileGenerationChat(request: ChatRequest): Promise<ChatResponse> {
    const client = this.getClient();
    const settings = useSettings.getState().settings;
    const model = settings.api.openai.selectedModel || settings.api.openai.models[0];

    // Check if we can infer enough information to generate immediately
    const inferredInfo = this.inferFileGenerationInfo(request.message);
    if (inferredInfo) {
      const generatedFile = await this.generateFile(inferredInfo);
      
      // If a file was generated, refresh the sidebar and open the file
      try {
        await FileService.writeFile(generatedFile.filename, generatedFile.content);
        console.log("✅ File written successfully:", generatedFile.filename);
        
        const collectedInfo: FileGenerationCollectedInfo = {
          filename: generatedFile.filename,
          description: inferredInfo.description,
          outline: inferredInfo.outline,
          generatedFilePath: generatedFile.filename
        };
        
        return {
          message: `I've generated a baseline ${inferredInfo.description}. You can now view and edit it, and I'll help you refine it further.\n\nFile generated: ${generatedFile.filename}`,
          fileGeneration: {
            shouldGenerate: true,
            collectedInfo
          }
        };
      } catch (error: any) {
        console.error("❌ Error writing file:", error);
        const collectedInfo: FileGenerationCollectedInfo = {
          filename: inferredInfo.filename,
          description: inferredInfo.description,
          outline: inferredInfo.outline
        };
        
        return {
          message: `I generated the content but couldn't save the file. Error: ${error.message}`,
          error: true,
          fileGeneration: {
            shouldGenerate: false,
            collectedInfo
          }
        };
      }
    }

    // If we can't infer enough, fall back to conversation mode
    const systemPrompt = `You are a helpful AI assistant specializing in document planning and generation.
Your task is to help users create well-structured documents through conversation.

Guidelines:
1. Be proactive - if you can reasonably infer what the user needs, proceed with generation
2. Only ask essential questions if critical information is missing
3. Keep responses brief and focused
4. Prioritize getting started with a baseline document that can be improved

Respond in JSON format:
{
  "message": "Your response to the user",
  "fileGeneration": {
    "shouldGenerate": boolean,
    "collectedInfo": {
      "filename": string (optional),
      "description": string (optional),
      "outline": string (optional),
      "requirements": string[] (optional),
      "generatedFilePath": string (optional)
    }
  }
}`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: request.message
      }
    ];

    const completion = await client.chat.completions.create({
      model,
      messages,
      response_format: { type: "json_object" }
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');

    // If we have all needed info and should generate, do it
    if (response.fileGeneration?.shouldGenerate && response.fileGeneration.collectedInfo) {
      const generatedFile = await this.generateFile({
        filename: response.fileGeneration.collectedInfo.filename,
        description: response.fileGeneration.collectedInfo.description,
        outline: response.fileGeneration.collectedInfo.outline
      });

      return {
        message: `${response.message}\n\nI've generated the file: ${generatedFile.filename}\n\n${generatedFile.message}`,
        fileGeneration: response.fileGeneration
      };
    }

    return {
      message: response.message,
      fileGeneration: response.fileGeneration
    };
  }

  private inferFileGenerationInfo(message: string): GenerateFileRequest | null {
    // Extract document type and subject
    const docTypeMatch = message.match(/(?:generate|create|write|make)\s+(?:a|an)?\s+([a-z\s]+)(?:\s+for|about|on)\s+(?:a|an)?\s+([^,.!?]+)/i);
    if (!docTypeMatch) return null;

    const [, docType, subject] = docTypeMatch;
    const cleanDocType = docType.trim().toLowerCase();
    const cleanSubject = subject.trim().toLowerCase();

    // Format filename based on document type
    const getFileName = (type: string, subj: string) => {
      const parts = subj.split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1));
      return `${parts.join('')}_${type.replace(/\s+/g, '_')}.html`;
    };

    // Get document structure based on type
    const getDocumentStructure = (type: string) => {
      switch (type) {
        case 'prd':
        case 'product requirements document':
          return {
            title: 'Product Requirements Document',
            sections: [
              { title: 'Overview', level: 1 },
              { title: 'Purpose', level: 2 },
              { title: 'Target Users', level: 2 },
              { title: 'Key Features', level: 1 },
              { title: 'Technical Requirements', level: 1 },
              { title: 'User Experience', level: 1 },
              { title: 'Implementation Phases', level: 1 },
              { title: 'Success Metrics', level: 1 }
            ]
          };
        case 'design document':
        case 'design spec':
          return {
            title: 'Design Document',
            sections: [
              { title: 'Introduction', level: 1 },
              { title: 'System Architecture', level: 1 },
              { title: 'Technical Design', level: 1 },
              { title: 'Data Models', level: 2 },
              { title: 'APIs and Interfaces', level: 2 },
              { title: 'User Interface Design', level: 1 },
              { title: 'Security Considerations', level: 1 },
              { title: 'Performance Requirements', level: 1 },
              { title: 'Testing Strategy', level: 1 }
            ]
          };
        default:
          return {
            title: 'Document',
            sections: [
              { title: 'Introduction', level: 1 },
              { title: 'Overview', level: 1 },
              { title: 'Details', level: 1 },
              { title: 'Implementation', level: 1 },
              { title: 'Conclusion', level: 1 }
            ]
          };
      }
    };

    const structure = getDocumentStructure(cleanDocType);
    const filename = getFileName(cleanDocType, cleanSubject);

    // Generate HTML content
    const content = `<h1>${structure.title}: ${subject.charAt(0).toUpperCase() + subject.slice(1)}</h1>
${structure.sections.map(section => `
<h${section.level}>${section.title}</h${section.level}>
<p>[${section.title} content will be generated here]</p>
`).join('\n')}`;

    return {
      filename,
      description: `${cleanDocType} for ${cleanSubject}`,
      content
    };
  }
}

export const aiService = new AIService(); 