import {
  IsLowercase,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  HasMimeType,
  IsFile,
  MaxFileSize,
  MemoryStoredFile,
} from 'nestjs-form-data';

export class UpdateProfileDataRequestDto {
  @IsOptional()
  @IsString({ message: 'Username must be a string' })
  @Matches(
    /^https?:\/\/(?:res\.cloudinary\.com|cloudinary\.com)\/[^\/]+\/image\/upload\/.*$/,
    {
      message: 'Invalid Cloudinary URL',
    },
  )
  avatarUrl: string | null;

  @IsString({ message: 'Username must be a string' })
  @IsNotEmpty({ message: 'Username is required' })
  @IsLowercase({ message: 'Username must be lowercase' })
  @MaxLength(20, { message: 'Username must be at most 20 characters long' })
  username: string;

  @IsString({ message: 'Name must be a string.' })
  @IsNotEmpty({ message: 'Name must not be empty.' })
  @MaxLength(50, { message: 'Name must be at most 50 characters.' })
  name: string;

  @IsString({ message: 'Description must be a string.' })
  @MaxLength(140, { message: 'Description must be at most 140 characters.' })
  about: string;
}

export class UploadProfilePictureRequestDto {
  @IsFile({ message: 'Avatar image must be a file.' })
  @MaxFileSize(5 * 1024 * 1024, {
    message: 'Avatar image must be smaller than 5MB.',
  })
  @HasMimeType(['image/png', 'image/jpeg', 'image/webp'], {
    message: 'Avatar image must be a PNG, JPEG, or WEBP image.',
  })
  avatarImage: MemoryStoredFile;
}

export interface UploadProfilePictureResponseDto {
  newAvatarUrl: string;
}
