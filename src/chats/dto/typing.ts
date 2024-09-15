import { IsNotEmpty, IsUUID } from 'class-validator';

export class SendTypingRequestDto {
  @IsNotEmpty({ message: 'chatId is required' })
  @IsUUID(4, { message: 'chatId must be a valid UUID' })
  chatId: string;
}

export class SendStopTypingRequestDto {
  @IsNotEmpty({ message: 'chatId is required' })
  @IsUUID(4, { message: 'chatId must be a valid UUID' })
  chatId: string;
}
