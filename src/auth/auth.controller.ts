import { AuthService } from './auth.service';
import {
  SecurityRequestDto,
  SessionResponseDto,
  SignInRequestDto,
  SignUpRequestDto,
} from './dto';
import { HttpJwtGuard } from './guards';
import { UserPayload } from './interfaces';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { HttpReqUser } from 'src/common/decorators';
import { Public } from 'src/common/decorators/public.decorator';
import { ResponseFactory } from 'src/common/dto';

@Controller('auth')
@UseGuards(HttpJwtGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-in')
  @Public()
  @HttpCode(200)
  async signIn(
    @Body() body: SignInRequestDto,
    @Res({ passthrough: true }) respose: Response,
  ) {
    // Call login service
    const { token, user } = await this.authService.signIn(body);

    // Map result to response
    const responseData: SessionResponseDto = {
      userId: user.id,
      username: user.username,
    };

    // Set cookie
    respose.cookie('auth-token', token, {
      maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    return ResponseFactory.createSuccessResponseWithData(
      'Sign in success',
      responseData,
    );
  }

  @Get('sign-out')
  @HttpCode(200)
  async logout(@Res({ passthrough: true }) respose: Response) {
    // Clear cookie
    respose.clearCookie('auth-token');

    return ResponseFactory.createSuccessResponse('Sign out success');
  }

  @Post('sign-up')
  @Public()
  @HttpCode(201)
  async register(@Body() body: SignUpRequestDto) {
    // Call register service
    await this.authService.signUp(body);

    return ResponseFactory.createSuccessResponse('Sign up success');
  }

  @Get('session')
  @HttpCode(200)
  async self(@HttpReqUser() user: UserPayload) {
    // Map response
    const responseData: SessionResponseDto = {
      userId: user.userId,
      username: user.username,
    };

    // Return response
    return ResponseFactory.createSuccessResponseWithData(
      'Get session success',
      responseData,
    );
  }

  @Patch('security')
  @HttpCode(200)
  async security(
    @Body() body: SecurityRequestDto,
    @HttpReqUser() reqUser: UserPayload,
  ) {
    await this.authService.changePassword(reqUser.userId, body);

    return ResponseFactory.createSuccessResponse('Change password success');
  }
}
