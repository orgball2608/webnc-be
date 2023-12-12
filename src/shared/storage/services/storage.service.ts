import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PROVIDERS } from '@src/constants';

@Injectable()
export class StorageService {
  constructor(
    @Inject(PROVIDERS.STORAGE)
    private readonly storageClient: S3Client,
    private readonly configService: ConfigService,
  ) {}

  async uploadFile(params: { key: string; file: Express.Multer.File }) {
    const { key, file } = params;
    const bucketName = this.configService.getOrThrow<string>(
      'aws.awsPublicBucketsKey',
    );

    const uploadParams = {
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await this.storageClient.send(new PutObjectCommand(uploadParams));
    const cloudfrontURL = this.configService.getOrThrow<string>(
      'aws.awsCloudfrontURL',
    );
    return `${cloudfrontURL}${key}`;
  }

  async deleteFile(key: string) {
    const bucketName = this.configService.getOrThrow<string>(
      'aws.awsPublicBucketsKey',
    );

    const deleteParams = {
      Bucket: bucketName,
      Key: key,
    };

    try {
      await this.storageClient.send(new DeleteObjectCommand(deleteParams));
      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false };
    }
  }
}
