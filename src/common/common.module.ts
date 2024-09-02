import { HttpValidationPipe, WsValidationPipe } from './pipes/validation.pipe';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [HttpValidationPipe, WsValidationPipe],
  exports: [HttpValidationPipe, WsValidationPipe],
})
export class CommonModule {}
