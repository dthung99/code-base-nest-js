// src/modules/ai/dtos/responses/ai-process-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class AIProcessResponseDto {
  @ApiProperty({
    description: 'The processed result from the AI',
    example: '• First key point\n• Second key point\n• Third key point',
  })
  result: string;
}
