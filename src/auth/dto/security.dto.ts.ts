import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Match } from 'src/utils/class-validator';

export class SecurityRequestDto {
  @IsString({ message: 'Current Password must be a string' })
  @IsNotEmpty({ message: 'Current Password is required' })
  currentPassword: string;

  @IsString({ message: 'New Password must be a string' })
  @IsNotEmpty({ message: 'New Password is required' })
  @MinLength(8, { message: 'New Password must be at least 8 characters long' })
  @MaxLength(20, { message: 'New Password must be at most 20 characters long' })
  @Matches(/^(?=.*[a-z])/, {
    message: 'New Password must contain a lowercase letter',
  })
  @Matches(/^(?=.*[A-Z])/, {
    message: 'New Password must contain an uppercase letter',
  })
  @Matches(/^(?=.*[0-9])/, {
    message: 'New Password must contain a number',
  })
  @Matches(/^(?=.*[!@#$%^&*])/, {
    message: 'New Password must contain a special character',
  })
  newPassword: string;

  // Confirm password
  @IsString({ message: 'Confirm new password must be a string' })
  @IsNotEmpty({ message: 'Confirm new password is required' })
  @Match<SecurityRequestDto>('newPassword', {
    message: 'Confirm new password do not match',
  })
  confirmNewPassword: string;
}
