import { Injectable } from '@nestjs/common';
import {
  type DeliveryType,
  type ResourceType,
  type UploadApiOptions,
  v2 as cloudinary,
} from 'cloudinary';
import { MemoryStoredFile } from 'nestjs-form-data';
import { CustomConfigService } from 'src/config';

interface DeleteOption {
  resource_type?: ResourceType;
  type?: DeliveryType;
  invalidate?: boolean;
}

@Injectable()
export class BucketService {
  constructor(private readonly configService: CustomConfigService) {
    // Setup config
    cloudinary.config({
      cloud_name: this.configService.get('cloudinary.cloudName'),
      api_key: this.configService.get('cloudinary.apiKey'),
      api_secret: this.configService.get('cloudinary.apiSecret'),
    });
  }

  async upload(
    file: MemoryStoredFile,
    { folder, ...restApiOptions }: UploadApiOptions = {},
  ): Promise<string> {
    // Default options
    const resolvedFolder = folder
      ? `${this.configService.get('cloudinary.folder')}/${folder}`
      : '${this.configService.get("cloudinary.folder")}';
    const options: UploadApiOptions = {
      folder: resolvedFolder,
      overwrite: true,
      ...restApiOptions,
    };

    try {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(options, (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          })
          .end(file.buffer);
      });

      return (result as any).secure_url;
    } catch (error) {
      throw error;
    }
  }

  async delete(publicId: string, options: DeleteOption = {}): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, options);
    } catch (error) {
      throw error;
    }
  }
}
