import express, { Request, Response } from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface EnhanceRequest {
  selectedText: string;
  fullContent: string;
  prompt: string;
}

app.post('/enhance', async (req: Request<{}, {}, EnhanceRequest>, res: Response) => {
  try {
    const { selectedText, fullContent, prompt } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert editor. Your task is to enhance the selected text while maintaining consistency with the full context. Only return the enhanced version of the selected text, nothing else."
        },
        {
          role: "user",
          content: `Full context of the document:\n${fullContent}\n\nSelected text to enhance:\n${selectedText}\n\nHow to enhance it:\n${prompt}`
        }
      ],
      temperature: 0.7,
    });

    const enhancedText = completion.choices[0].message.content;
    res.json({ enhancedText });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Enhancement failed' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 