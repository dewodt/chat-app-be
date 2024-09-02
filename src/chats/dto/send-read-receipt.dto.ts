import { IsNotEmpty, IsUUID } from 'class-validator';

export class SendReadReceiptRequestDto {
  @IsNotEmpty({ message: 'chatId is required' })
  @IsUUID(4, { message: 'chatId must be a valid UUID' })
  chatId: string;

  @IsNotEmpty({ message: 'messageId is required' })
  @IsUUID(4, { message: 'messageId must be a valid UUID' })
  messageId: string;
}
