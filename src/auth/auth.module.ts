import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HttpJwtGuard, WsJwtGuard } from './guards';
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CustomConfigService } from 'src/config/config.service';

@Global()
@Module({
  imports: [
    // Jwt configuration
    JwtModule.registerAsync({
      inject: [CustomConfigService],
      useFactory: (configService: CustomConfigService) => ({
        secret: configService.get('jwtSecret'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, HttpJwtGuard, WsJwtGuard],
  exports: [AuthService, HttpJwtGuard, WsJwtGuard],
})
export class AuthModule {}
