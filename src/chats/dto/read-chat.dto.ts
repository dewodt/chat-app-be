import { IsUUID } from 'class-validator';

export class ReadChatRequestDto {
  @IsUUID(4, { message: 'Invalid chatId' })
  chatId: string;
}
