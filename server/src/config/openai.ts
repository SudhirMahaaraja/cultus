import path from 'path';
import dotenv from 'dotenv';
import { AzureOpenAI, OpenAI } from 'openai';

// Load environment variables from server/.env or root .env
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const isAzure = Boolean(process.env.OPENAI_ENDPOINT);

export const openai = (isAzure
  ? new AzureOpenAI({
      endpoint: process.env.OPENAI_ENDPOINT,
      apiKey: process.env.OPENAI_API_KEY,
      apiVersion: process.env.OPENAI_API_VERSION || '2024-08-01-preview',
      deployment: process.env.OPENAI_LLM || 'gpt-4o-mini',
    })
  : new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    })) as unknown as OpenAI;
