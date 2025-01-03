import express, { Request } from 'express';
import cors from 'cors';
import OpenAI from "openai";
import dotenv from 'dotenv';
import { LineMetadata } from "./types/editor";
import { 
  AssistantRequest, 
  AssistantResponse, 
  EditOperation, 
  AnalyzeTextResponse, 
  DeleteTextResponse,
  EnhanceRequest,
  EnhanceResponse 
} from './types/assistant';
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
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Request: "${message}"\n\n` +
            `Filename: ${filename}\n\n` +
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

// Enhancement endpoint for direct text modifications
app.post("/enhance", async (req: Request<{}, any, EnhanceRequest>, res) => {
  const { selectedText, prompt, context, filename } = req.body;

  console.log('\n=== Enhancement Request ===');
  console.log('Selected Text:', selectedText);
  console.log('Prompt:', prompt);
  console.log('Context:', context);
  console.log('Filename:', filename);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert text editor and enhancer. Your task is to modify the provided text according to the user's prompt while maintaining:
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
- Keep the same general length unless explicitly asked to expand/shorten`
        },
        {
          role: "user",
          content: `Selected text: "${selectedText}"
          
Enhancement prompt: "${prompt}"
${context ? `Context: ${context}` : ''}
${filename ? `File: ${filename}` : ''}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}') as EnhanceResponse;
    
    console.log('\n=== Enhancement Response ===');
    console.log('Enhanced Text:', response.enhancedText);
    console.log('Explanation:', response.explanation);
    console.log('Changes:', response.changes);
    console.log('================\n');

    res.json(response);

  } catch (error) {
    console.error('\n=== Enhancement Error ===');
    console.error('Error:', error);
    res.status(500).json({ error: "Failed to enhance text" });
  }
});

function getSystemPrompt(operation: EditOperation, filename: string, isFileQuery?: boolean): string {
  const basePrompt = `You are a precise document editor working on "${filename}". `;
  const responseFormat = 'Respond in JSON format following the specified structure for each operation type.\n\nIMPORTANT: Always use type: "paragraph" for all content. Never use headers or list items.';
  
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
      '6. IMPORTANT: When a specific number of lines is requested (e.g., "add 5 lines"), you MUST generate exactly that number of lines\n\n' +
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
      // Extract number from message if it exists (e.g., "add 5 lines")
      const requestedLines = parseInt(response.message.match(/add (\d+) lines?/i)?.[1] || '0');
      
      // If a specific number was requested but not met, return an error
      if (requestedLines > 0 && response.newLines.length !== requestedLines) {
        return {
          message: `Error: Requested ${requestedLines} lines but received ${response.newLines.length}. Please try again.`,
          error: true
        };
      }

      const newLines = response.newLines.map((line, index) => ({
        content: line.content.replace(/<[^>]*>/g, ''),
        type: line.type,
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
          id: crypto.randomUUID(),
          number: 1,
          content: ' ',
          type: 'paragraph',
          timestamp: new Date(),
          lastModified: new Date()
        });
      }

      return {
        message: response.message,
        enhancedText: { lines: remainingLines }
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