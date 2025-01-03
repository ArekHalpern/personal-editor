import express, { Request } from 'express';
import cors from 'cors';
import OpenAI from "openai";
import dotenv from 'dotenv';
import { LineMetadata } from "./types/editor";
import { AssistantRequest, AssistantResponse, EditOperation, AnalyzeTextResponse } from './types/assistant';
import { parseCommand } from './utils/commandParser';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Chat endpoint for user interaction
app.post("/chat", async (req: Request<{}, any, AssistantRequest>, res) => {
  const { message, lineMetadata, selectedText, fullContent, filename } = req.body;

  console.log('\n=== Chat Request ===');
  console.log('Message:', message);
  console.log('Selected Text:', selectedText || 'None');
  console.log('Filename:', filename);

  try {
    // Parse the command to determine operation
    const command = parseCommand(message);
    console.log('Parsed Command:', command);

    // Build the system prompt based on the operation
    const systemPrompt = getSystemPrompt(command.operation, filename, command.isFileQuery);

    // Get target lines based on command
    const targetLines = getTargetLines(command, lineMetadata, selectedText);

    // Make the OpenAI API call
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Request: "${message}"\n\n` +
            `Document Content:\n${fullContent}\n\n` +
            `${selectedText ? `Selected Text:\n${selectedText}\n\n` : ''}` +
            `Lines to Consider:\n${JSON.stringify(targetLines, null, 2)}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const response = JSON.parse(completion.choices[0].message.content || '{"operation":"analyze_text","message":"Unable to process request"}') as AssistantResponse;
    
    // Process the response based on operation type
    const result = await processResponse(response, lineMetadata);
    
    console.log('\n=== Chat Response ===');
    console.log('Operation:', response.operation);
    console.log('Response:', result.message);
    if (result.analysis) {
      console.log('Analysis:', JSON.stringify(result.analysis, null, 2));
    }
    if (result.enhancedText) {
      console.log('Enhanced Text:', JSON.stringify(result.enhancedText, null, 2));
    }
    console.log('================\n');

    res.json(result);

  } catch (error) {
    console.error('\n=== Chat Error ===');
    console.error('Full error:', error);
    res.status(500).json({ error: "Failed to process chat message" });
  }
});

function getSystemPrompt(operation: EditOperation, filename: string, isFileQuery?: boolean): string {
  const basePrompt = `You are a precise document editor working on "${filename}". `;
  const responseFormat = 'Respond in JSON format following the specified structure for each operation type.';
  
  const operationPrompts: Record<EditOperation, string> = {
    'inline_edit': basePrompt + 
      'Your task is to edit the specified content inline while maintaining context and style.\n\n' +
      'Rules:\n' +
      '1. Keep changes minimal and focused\n' +
      '2. Preserve the original meaning\n' +
      '3. Maintain consistent style\n' +
      '4. Never include HTML tags\n' +
      '5. Preserve existing formatting (headers, paragraphs, etc.)\n' +
      '6. Only change content, not structure unless explicitly requested\n\n' +
      responseFormat + '\n' +
      'JSON Response Structure:\n' +
      '{\n' +
      '  "operation": "inline_edit",\n' +
      '  "message": "Description of changes",\n' +
      '  "changes": [{ "lineNumber": number, "content": string, "type": "heading" | "paragraph" | "list-item", "attrs": { "level": 1 | 2 } }]\n' +
      '}',

    'multi_line_edit': basePrompt +
      'Your task is to edit multiple lines while maintaining document coherence.\n\n' +
      'Rules:\n' +
      '1. Keep the same number of lines\n' +
      '2. Preserve line numbers and relationships\n' +
      '3. Maintain document flow\n' +
      '4. Never include HTML tags\n' +
      '5. Preserve existing formatting (headers, paragraphs, etc.)\n' +
      '6. Only change content, not structure unless explicitly requested\n\n' +
      responseFormat + '\n' +
      'JSON Response Structure:\n' +
      '{\n' +
      '  "operation": "multi_line_edit",\n' +
      '  "message": "Description of changes",\n' +
      '  "changes": [{ "lineNumber": number, "content": string, "type": "heading" | "paragraph" | "list-item", "attrs": { "level": 1 | 2 } }]\n' +
      '}',

    'continue_text': basePrompt +
      'Your task is to continue the document naturally after the specified point.\n\n' +
      'Rules:\n' +
      '1. Match existing style and tone\n' +
      '2. Add meaningful content\n' +
      '3. Maintain natural flow\n' +
      '4. Never include HTML tags\n\n' +
      responseFormat + '\n' +
      'JSON Response Structure:\n' +
      '{\n' +
      '  "operation": "continue_text",\n' +
      '  "message": "Description of continuation",\n' +
      '  "newLines": [{ "content": string, "type": "heading" | "paragraph" | "list-item", "attrs": { "level": 1 | 2 } }],\n' +
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
  };

  return operationPrompts[operation];
}

function getTargetLines(
  command: ReturnType<typeof parseCommand>,
  lineMetadata: LineMetadata[],
  selectedText?: string
): LineMetadata[] {
  if (selectedText) {
    return lineMetadata.filter(line => selectedText.includes(line.content));
  }

  if (command.lineNumbers?.length) {
    return lineMetadata.filter(line => command.lineNumbers?.includes(line.number));
  }

  if (command.operation === 'continue_text' && typeof command.afterLine === 'number') {
    return lineMetadata.filter(line => line.number <= command.afterLine!);
  }

  return lineMetadata;
}

async function processResponse(
  response: AssistantResponse,
  lineMetadata: LineMetadata[]
): Promise<any> {
  const now = Date.now();

  switch (response.operation) {
    case 'inline_edit':
    case 'multi_line_edit':
      const updatedLines = lineMetadata.map(line => {
        const change = response.changes.find(c => c.lineNumber === line.number);
        if (change) {
          return {
            ...line,
            content: change.content.replace(/<[^>]*>/g, ''),
            type: change.type,
            attrs: change.attrs,
            timestamp: now,
            lastModified: now,
            aiEnhanced: true,
            aiMetadata: {
              ...line.aiMetadata,
              lastEnhanced: new Date(now),
              enhancementPrompt: response.message,
              originalContent: line.content
            }
          };
        }
        return line;
      });
      return {
        message: response.message,
        enhancedText: { lines: updatedLines }
      };

    case 'continue_text':
      const newLines = response.newLines.map((line, index) => ({
        content: line.content.replace(/<[^>]*>/g, ''),
        // Use the correct type and attrs structure
        type: line.type,
        attrs: line.attrs,
        id: crypto.randomUUID(),
        number: response.afterLine + index + 1,
        timestamp: new Date(now),
        lastModified: new Date(now),
        aiEnhanced: true,
        aiMetadata: {
          lastEnhanced: new Date(now),
          enhancementPrompt: response.message
        }
      }));

      const continuedLines = lineMetadata.map(line => ({
        ...line,
        number: line.number > response.afterLine ? line.number + newLines.length : line.number
      })) as LineMetadata[];

      return {
        message: response.message,
        enhancedText: { lines: [...continuedLines, ...newLines] }
      };

    case 'summarize_text':
      return {
        message: response.summary,
        enhancedText: null
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
        enhancedText: null
      };

    default:
      return {
        message: "Unable to process the request",
        enhancedText: null
      };
  }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 