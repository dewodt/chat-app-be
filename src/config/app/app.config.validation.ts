import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  CLIENT_HOST: string;

  @IsNumber()
  @Min(0)
  @Max(65535)
  CLIENT_PORT: number;

  @IsString()
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  CLIENT_URL: string;

  @IsString()
  @IsNotEmpty()
  SERVER_HOST: string;

  @IsNumber()
  @Min(0)
  @Max(65535)
  SERVER_PORT: number;

  @IsString()
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  SERVER_URL: string;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsNumber()
  @Min(0)
  @Max(65535)
  DB_PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  CLOUDINARY_CLOUD_NAME: string;

  @IsString()
  @IsNotEmpty()
  CLOUDINARY_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  CLOUDINARY_API_SECRET: string;

  @IsString()
  @IsNotEmpty()
  CLOUDINARY_FOLDER: string;
}

/**
 * @function validate
 * validates the configuration object using the class-validator.
 *
 * @param config
 * @returns
 */
export function validateConfig(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
