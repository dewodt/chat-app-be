import { IsNotEmpty, IsUUID } from 'class-validator';

export class SendMessageRequestDto {
  @IsNotEmpty({ message: 'chatId is required' })
  @IsUUID(4, { message: 'chatId must be a valid UUID' })
  chatId: string;

  @IsNotEmpty({ message: 'message is required' })
  message: string;
}
