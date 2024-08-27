import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CustomConfigService } from 'src/config';

@Module({
  imports: [
    // Jwt utils
    JwtModule.registerAsync({
      inject: [CustomConfigService],
      useFactory: (configService: CustomConfigService) => ({
        secret: configService.get('jwtSecret'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
