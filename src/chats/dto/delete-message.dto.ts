import { IsNotEmpty, IsUUID } from 'class-validator';

export class DeleteMessageRequestDto {
  @IsNotEmpty({ message: 'messageId is required' })
  @IsUUID(4, { message: 'messageId must be a valid UUID' })
  messageId: string;
}
