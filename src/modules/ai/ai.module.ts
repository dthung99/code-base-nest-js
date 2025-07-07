// src/modules/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './controllers/ai.controller';
import { GeminiService } from './services/gemini.service';
import geminiConfig from './config/gemini.config';

@Module({
  imports: [ConfigModule.forFeature(geminiConfig)],
  controllers: [AiController],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class AiModule {}
