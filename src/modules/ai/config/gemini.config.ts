// src/modules/ai/config/gemini.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('gemini', () => ({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY ?? '',
  model: process.env.GEMINI_MODEL ?? 'gemini-pro',
  maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS ?? '1024', 10),
  temperature: parseFloat(process.env.GEMINI_TEMPERATURE ?? '0.7'),
}));
