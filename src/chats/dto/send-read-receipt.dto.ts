import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class SendReadReceiptRequestDto {
  @IsArray({ message: 'messageIds must be an array' })
  @ArrayNotEmpty({ message: 'messageIds must not be empty' })
  @IsUUID(4, {
    each: true,
    message: 'messageIds must be an array of valid UUIDs',
  })
  messageIds: string[];
}
