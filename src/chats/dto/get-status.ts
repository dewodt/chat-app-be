import { STATUS } from '../entities';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class GetStatusRequestDto {
  @IsNotEmpty({ message: 'chatId is required' })
  @IsUUID(4, { message: 'Invalid chatId' })
  chatId: string;
}

export interface GetStatusResponseDto {
  chatId: string;
  status: STATUS;
}
