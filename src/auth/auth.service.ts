import { SignInRequestDto, SignUpRequestDto } from './dto';
import { JwtPayload, UserPayload } from './interfaces';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
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
        ResponseFactory.createErrorResponse('Invalid credentials'),
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
}
