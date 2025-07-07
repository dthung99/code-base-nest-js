// src/modules/ai/services/gemini.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { AIInputData } from '../interfaces/ai-input.interface';

@Injectable()
export class GeminiService {
  private readonly model: ChatGoogleGenerativeAI;
  readonly genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('gemini.apiKey');
    const modelName = this.configService.get<string>('gemini.model');
    const temperature = this.configService.get<number>('gemini.temperature');
    const maxTokens = this.configService.get<number>('gemini.maxTokens');

    if (!apiKey) {
      throw new Error('Google Gemini API key is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);

    this.model = new ChatGoogleGenerativeAI({
      model: modelName ?? 'gemini-2.0-flash',
      apiKey,
      temperature,
      maxOutputTokens: maxTokens,
    });
  }

  /**
   * Process text using LangChain integration
   */
  async processText(inputData: AIInputData): Promise<string> {
    try {
      // Create a prompt that combines the requirement and text
      const promptTemplate = PromptTemplate.fromTemplate(
        `Requirement: {requirement}\n\nText: {text}\n\nPlease process the above text according to the requirement.`,
      );

      const chain = RunnableSequence.from([
        promptTemplate,
        this.model,
        new StringOutputParser(),
      ]);

      const response = await chain.invoke({
        requirement: inputData.requirement,
        text: inputData.text,
      });

      return response;
    } catch {
      // this.logger.error(`Error processing text: ${error.message}`, error.stack);
      throw new Error(`Failed to process text`);
    }
  }
}
