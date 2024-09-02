import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class JoinChatRequestDto {
  @IsArray({ message: 'chatIds must be an array' })
  @ArrayNotEmpty({ message: 'chatIds must not be empty' })
  @IsUUID(4, { each: true, message: 'chatIds must be an array of valid UUIDs' })
  chatIds: string[];
}
