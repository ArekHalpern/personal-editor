import * as dotenv from 'dotenv';
import OpenAI from "openai";
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function initializeMainAssistant() {
  try {
    console.log('Creating main assistant...');
    const assistant = await openai.beta.assistants.create({
      name: "Editor Assistant",
      description: "A smart editor assistant that helps with document editing and enhancement",
      model: "gpt-4o-mini",
      tools: [{
        type: "function",
        function: {
          name: "inline_edit",
          description: "Edit specific lines in the document",
          parameters: {
            type: "object",
            properties: {
              lineNumbers: {
                type: "array",
                items: { type: "number" },
                description: "The line numbers to edit"
              },
              instruction: {
                type: "string",
                description: "How to edit these lines"
              }
            },
            required: ["lineNumbers", "instruction"]
          }
        }
      }]
    });

    console.log('Assistant created with ID:', assistant.id);

    // Read existing .env file
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch (error) {
      console.log('No existing .env file found, creating new one');
    }

    // Update or add MAIN_ASSISTANT_ID
    if (envContent.includes('MAIN_ASSISTANT_ID=')) {
      envContent = envContent.replace(
        /MAIN_ASSISTANT_ID=.*/,
        `MAIN_ASSISTANT_ID=${assistant.id}`
      );
    } else {
      envContent += `\nMAIN_ASSISTANT_ID=${assistant.id}`;
    }

    // Write back to .env file
    fs.writeFileSync(envPath, envContent);
    console.log('Updated .env file with MAIN_ASSISTANT_ID');

  } catch (error) {
    console.error('Error initializing assistant:', error);
    process.exit(1);
  }
}

initializeMainAssistant(); 