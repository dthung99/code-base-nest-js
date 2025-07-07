// src/modules/ai/controllers/ai.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { GeminiService } from '../services/gemini.service';
import { AIProcessDto } from '../dtos/requests/ai-process.dto';
import { AIProcessResponseDto } from '../dtos/responses/ai-process-response.dto';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Post('process')
  @ApiOperation({
    summary: 'Process text according to the requirement using Gemini',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the processed text',
    type: AIProcessResponseDto,
  })
  async processText(
    @Body() aiProcessDto: AIProcessDto,
  ): Promise<AIProcessResponseDto> {
    const result = await this.geminiService.processText({
      requirement: aiProcessDto.requirement,
      text: aiProcessDto.text,
    });
    return { result };
  }
}
