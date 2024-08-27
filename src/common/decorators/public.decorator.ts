import { SetMetadata, CustomDecorator } from '@nestjs/common';

export const PUBLIC_KEY = 'isPublic';

export const Public = (): CustomDecorator => SetMetadata(PUBLIC_KEY, true);
