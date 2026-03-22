import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

export class PromptInteractionStatusRequestDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  promptIds: string[] = [];
}
