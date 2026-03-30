import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReplyCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;
}
