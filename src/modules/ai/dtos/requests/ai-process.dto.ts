// src/modules/ai/dtos/requests/ai-process.dto.ts
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AIProcessDto {
  @ApiProperty({
    description: 'The requirements for processing the text',
    example: 'Summarize the following text in three bullet points',
  })
  @IsString()
  requirement: string;

  @ApiProperty({
    description: 'The text to be processed by the AI',
    example: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
  })
  @IsString()
  text: string;
}
