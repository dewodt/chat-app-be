import { IsNotEmpty, IsUUID } from 'class-validator';

export class EditMessageRequestDto {
  @IsNotEmpty({ message: 'messageId is required' })
  @IsUUID(4, { message: 'messageId must be a valid UUID' })
  messageId: string;

  @IsNotEmpty({ message: 'newMessage is required' })
  newMessage: string;
}
