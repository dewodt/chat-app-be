import { SignInRequestDto, SignUpRequestDto } from './dto';
import { SecurityRequestDto } from './dto/security.dto.ts';
import { JwtPayload, UserPayload } from './interfaces';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import * as cookieParser from 'cookie';
import { Request } from 'express';
import { Socket } from 'socket.io';
import { ResponseFactory } from 'src/common/dto';
import { User } from 'src/users/entities';
import { DataSource } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    private dataSource: DataSource,
    private jwtService: JwtService,
  ) {}

  /**
   * Extracts token from socket.io connection
   *
   * @param socket
   * @returns
   */
  wsExtractJwtToken(socket: Socket): string | null {
    // 1. Cookie
    const headerCookies = socket.handshake.headers.cookie || '';
    const parsedCookies = cookieParser.parse(headerCookies);
    const cookieAuthToken = parsedCookies['auth-token'] as string | undefined;

    // 2. Handshake auth
    const handshakeAuthToken = socket.handshake.auth['auth-token'] as
      | string
      | undefined;

    // 3. Bearer
    const [bearer, headerToken] =
      socket.handshake.headers.authorization?.split(' ') || [];
    const headersAuthToken = bearer === 'Bearer' ? headerToken : undefined;

    let authToken: string | null = null;
    if (cookieAuthToken) {
      authToken = cookieAuthToken;
    } else if (handshakeAuthToken) {
      authToken = handshakeAuthToken;
    } else if (headersAuthToken) {
      authToken = headersAuthToken;
    } else {
      return null;
    }

    return authToken;
  }

  /**
   * Extranct jwt from http request
   *
   * @param request
   * @returns
   */
  httpExtractJwtToken(request: Request): string | null {
    // Get from cookie
    const jwtFromCookie = request.cookies['auth-token'] as string | undefined;

    // Get from header
    const [type, bearerToken] = request.headers.authorization?.split(' ') || [
      '',
      '',
    ];
    const jwtFromHeader = type === 'Bearer' ? bearerToken : undefined;

    if (jwtFromCookie) {
      return jwtFromCookie;
    } else if (jwtFromHeader) {
      return jwtFromHeader;
    } else {
      return null;
    }
  }

  /**
   * Verify JWT
   *
   * @param token
   * @returns UserPayload | null
   */
  async verifyJwt(token: string): Promise<UserPayload | null> {
    let userPayload: UserPayload | null = null;

    try {
      const jwtPayload = await this.jwtService.verifyAsync<JwtPayload>(token);

      userPayload = {
        userId: jwtPayload.sub,
        username: jwtPayload.username,
      };

      return userPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate user
   *
   * @param usernameOrEmail
   * @param password
   * @returns
   */
  async validateUser(username: string, password: string): Promise<User | null> {
    // Find user by username
    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: [{ username: username }],
    });

    // Check if user exists
    if (!user) {
      return null;
    }

    // Check if password is correct
    const isPasswordCorrect = await compare(password, user.password);
    if (!isPasswordCorrect) {
      return null;
    }

    return user;
  }

  /**
   * Sign UserPayload
   *
   * @param userPayload
   * @returns
   */
  async signJwt(userPayload: UserPayload): Promise<string> {
    const jwtPayload: JwtPayload = {
      sub: userPayload.userId,
      username: userPayload.username,
    };

    // Sign JWT
    let token: string | null = null;
    try {
      token = await this.jwtService.signAsync(jwtPayload, {
        expiresIn: '1d',
      });
    } catch (error) {
      throw new InternalServerErrorException(
        ResponseFactory.createErrorResponse('An error occurred'),
      );
    }

    return token;
  }

  async signIn(body: SignInRequestDto) {
    // Validate user
    const user = await this.validateUser(body.username, body.password);

    // Check if user exists
    if (!user) {
      throw new UnauthorizedException(
        ResponseFactory.createErrorResponse('Invalid credentials', [
          {
            field: 'username',
            message: 'Invalid credentials',
          },
          {
            field: 'password',
            message: 'Invalid credentials',
          },
        ]),
      );
    }

    // Sign JWT
    const userPayload: UserPayload = {
      userId: user.id,
      username: user.username,
    };
    const token = await this.signJwt(userPayload);

    return {
      token,
      user,
    };
  }

  async signUp(body: SignUpRequestDto): Promise<User> {
    // Check if username exists
    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: [{ username: body.username }],
    });

    if (user) {
      throw new BadRequestException(
        ResponseFactory.createErrorResponse('Username already exists', [
          {
            field: 'username',
            message: 'Username already exists',
          },
        ]),
      );
    }

    // Create user
    const hashedPassword = await hash(body.password, 10);

    let insertedUser: User | null = null;
    const newUser = userRepository.create({
      username: body.username,
      name: body.name,
      password: hashedPassword,
      about: "Can't talk, ChatApp only!", // Default status
    });

    try {
      insertedUser = await userRepository.save(newUser);
    } catch (error) {
      // Internal error
      throw new InternalServerErrorException(
        ResponseFactory.createErrorResponse('An error occurred'),
      );
    }

    return insertedUser;
  }

  async changePassword(currentUserId: string, body: SecurityRequestDto) {
    // Find user
    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOneBy({ id: currentUserId });

    // Check if user exists
    if (!user) {
      throw new NotFoundException(
        ResponseFactory.createErrorResponse('User not found'),
      );
    }

    // Check if current password is correct
    const isCurrentPasswordCorrect = await compare(
      body.currentPassword,
      user.password,
    );

    // Current password is invalid
    if (!isCurrentPasswordCorrect) {
      throw new BadRequestException(
        ResponseFactory.createErrorResponse('Current password is invalid', [
          {
            field: 'currentPassword',
            message: 'Current password is invalid',
          },
        ]),
      );
    }

    // Current password valid, check if new password is different
    if (body.currentPassword === body.newPassword) {
      throw new BadRequestException(
        ResponseFactory.createErrorResponse(
          'New password must be different from the current password',
          [
            {
              field: 'newPassword',
              message:
                'New password must be different from the current password',
            },
            {
              field: 'confirmNewPassword',
              message:
                'New password must be different from the current password',
            },
          ],
        ),
      );
    }

    // Update password
    const hashedPassword = await hash(body.newPassword, 10);
    user.password = hashedPassword;

    try {
      const updatedUser = await userRepository.save(user);
      return { updatedUser };
    } catch (error) {
      throw new InternalServerErrorException(
        ResponseFactory.createErrorResponse('An error occurred'),
      );
    }
  }
}
