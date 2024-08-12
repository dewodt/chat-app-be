import { SignInDto, SignUpDto } from './dto';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, compare } from 'bcrypt';
import { ErrorDto } from 'src/common/dto';
import { User } from 'src/users/entities';
import { DataSource } from 'typeorm';
import { QueryFailedError } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    private dataSource: DataSource,
    private jwtService: JwtService,
  ) {}

  /**
   * Sign in user
   *
   * @param body - Sign in data
   */
  async signIn(body: SignInDto) {
    // Find user by username
    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { username: body.username },
    });

    // Check if user exists
    if (!user) {
      throw new UnauthorizedException(new ErrorDto('Invalid credentials'));
    }

    // Check if password is correct
    const isPasswordCorrect = await compare(body.password, user.password);

    if (!isPasswordCorrect) {
      throw new UnauthorizedException(new ErrorDto('Invalid credentials'));
    }

    // Generate JWT token
    const jwtToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        username: user.username,
      },
      {
        expiresIn: '1d',
      },
    );

    return jwtToken;
  }

  /**
   * Sign up user
   *
   * @param body - Sign up data
   * @returns void
   */
  async signUp(body: SignUpDto) {
    // Create new user
    const userRepository = this.dataSource.getRepository(User);

    const hashedPassword = await hash(body.password, 10);

    try {
      await userRepository.insert({
        name: body.name,
        username: body.username,
        password: hashedPassword,
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        error.driverError.code === '23505'
      ) {
        // Unique constraint violation
        throw new BadRequestException(
          new ErrorDto('Validation failed', [
            { field: 'username', message: 'Username already exists' },
          ]),
        );
      } else {
        // Other error
        throw new InternalServerErrorException(
          new ErrorDto('An error occurred while signing up'),
        );
      }
    }
  }
}
