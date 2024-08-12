import { AuthService } from './auth.service';
import { SignInDto, SignUpDto } from './dto';
import { JwtAuthGuard } from './jwt';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReqUser } from 'src/common';
import { SuccessDto } from 'src/common/dto';
import { ConfigService } from 'src/config';

@Controller('auth')
export class AuthController {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {}

  @Post('sign-in')
  @HttpCode(200)
  async signIn(
    @Body() body: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Sign in user & get generated JWT token
    const jwtToken = await this.authService.signIn(body);

    // Add cookie to response
    res.cookie('chat-app-auth', jwtToken, {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      httpOnly: true,
      secure: this.configService.get('env') === 'production',
      sameSite: 'strict',
    });

    // Return response
    return new SuccessDto('Sign in successful');
  }

  @Post('sign-up')
  @HttpCode(201)
  async signUp(@Body() body: SignUpDto) {
    // Sign up user
    await this.authService.signUp(body);

    // Return response
    return new SuccessDto('Sign up successful');
  }

  @Get('session')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async getSession(@ReqUser() reqUser: ReqUser) {
    return new SuccessDto('Session active', reqUser);
  }
}
