import {
  IsLowercase,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Match } from 'src/utils/class-validator';

export class SignUpRequestDto {
  @IsString({ message: 'Username must be a string' })
  @IsNotEmpty({ message: 'Username is required' })
  @IsLowercase({ message: 'Username must be lowercase' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(20, { message: 'Username must be at most 20 characters long' })
  username: string;

  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(50, { message: 'Name must be at most 50 characters long' })
  name: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(20, { message: 'Password must be at most 20 characters long' })
  @Matches(/^(?=.*[a-z])/, {
    message: 'Password must contain a lowercase letter',
  })
  @Matches(/^(?=.*[A-Z])/, {
    message: 'Password must contain an uppercase letter',
  })
  @Matches(/^(?=.*[0-9])/, {
    message: 'Password must contain a number',
  })
  @Matches(/^(?=.*[!@#$%^&*])/, {
    message: 'Password must contain a special character',
  })
  password: string;

  // Confirm password
  @IsString({ message: 'Confirm password must be a string' })
  @IsNotEmpty({ message: 'Confirm password is required' })
  @Match<SignUpRequestDto>('password', {
    message: 'Confirm password do not match',
  })
  confirmPassword: string;
}
