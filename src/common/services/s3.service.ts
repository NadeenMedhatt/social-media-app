import { CompleteMultipartUploadCommandOutput, DeleteObjectCommand, DeleteObjectCommandOutput, DeleteObjectsCommand, DeleteObjectsCommandOutput, GetObjectCommand, GetObjectCommandOutput, ListObjectsV2Command, ListObjectsV2CommandOutput, ObjectCannedACL, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { APP_NAME, AWS_ACCESS_KEY_ID, AWS_BUCKET_NAME, AWS_EXPIRES_IN, AWS_REGION, AWS_SECRET_ACCESS_KEY } from "../../config/config"
import { StorageApproachEnum, uploadApproachEnum } from "../enums";
import { createReadStream } from "node:fs";
import { BadRequestException } from "../exceptions";
import { randomUUID } from "node:crypto";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
export class S3Service {
    private client: S3Client
    constructor() {
        this.client = new S3Client({
            region: AWS_REGION,
            credentials: {
                accessKeyId: AWS_ACCESS_KEY_ID,
                secretAccessKey: AWS_SECRET_ACCESS_KEY
            }
        })
    }

    async uploadFile({
        storeApproach = StorageApproachEnum.MEMORY,
        Bucket = AWS_BUCKET_NAME,
        path = "general",
        ACL = "private" as ObjectCannedACL,
        file,
        ContentType
    }: {
        storeApproach?: StorageApproachEnum;
        Bucket?: string;
        path?: string | undefined;
        ACL?: ObjectCannedACL;
        file: Express.Multer.File;
        ContentType?: string;
    }): Promise<string> {
        const command = new PutObjectCommand({
            Bucket,
            Key: `${APP_NAME}/${path}/${randomUUID()}__${file.originalname}`,
            ACL,
            Body:
                storeApproach === StorageApproachEnum.MEMORY ? file.buffer : createReadStream(file.path),
            ContentType: file.mimetype || ContentType,
        });

        if (!command.input?.Key) {
            throw new BadRequestException("Fail to upload", { file });
        }
        await this.client.send(command);
        return command.input.Key;
    }

    async uploadLargeFile({
        storeApproach = StorageApproachEnum.MEMORY,
        Bucket = AWS_BUCKET_NAME,
        path = "general",
        ACL = "private" as ObjectCannedACL,
        file,
        ContentType,
        partSize = 5

    }: {
        storeApproach?: StorageApproachEnum;
        Bucket?: string;
        path?: string | undefined;
        ACL?: ObjectCannedACL;
        file: Express.Multer.File;
        ContentType?: string;
        partSize?: number;

    }): Promise<CompleteMultipartUploadCommandOutput> {
        const upload = new Upload({
            client: this.client,
            params: {
                Bucket,
                Key: `${APP_NAME}/${path}/${randomUUID()}__${file.originalname}`,
                ACL,
                Body:
                    storeApproach === StorageApproachEnum.MEMORY
                        ? file.buffer
                        : createReadStream(file.path),
                ContentType: ContentType || file.mimetype,
            },
            partSize: partSize * 1024 * 1024,
        });

        upload.on("httpUploadProgress", (progress) => {
            console.log(`File upload progress is :::  ${((progress.loaded as number) / (progress.total as number)) * 100} %`);
        });
        return await upload.done();
    }

    async uploadFiles({
        storeApproach = StorageApproachEnum.MEMORY,
        uploadApproach = uploadApproachEnum.SMALL,
        Bucket = AWS_BUCKET_NAME,
        path = "general",
        ACL = "private" as ObjectCannedACL,
        files,
        ContentType

    }: {
        storeApproach?: StorageApproachEnum;
        uploadApproach?: uploadApproachEnum;
        Bucket?: string;
        path?: string | undefined;
        ACL?: ObjectCannedACL;
        files: Express.Multer.File[];
        ContentType?: string;

    }): Promise<string[]> {
        let urls: string[] = [];
        if (uploadApproach === uploadApproachEnum.LARGE) {
            const data = await Promise.all(
                files.map((file) => {
                    return this.uploadLargeFile({
                        storeApproach, Bucket,
                        path,
                        ACL,
                        file,
                        ContentType: ContentType || file.mimetype,

                    })
                })
            );
            urls = data.map((item) => item.Key as string);
        } else {
            urls = await Promise.all(
                files.map((file) => {
                    return this.uploadFile({
                        storeApproach, Bucket,
                        path,
                        ACL,
                        file,
                        ContentType: ContentType || file.mimetype,

                    })
                })
            );

        }
        return urls;
    };
    async createPreSignedFetchLink({
        Bucket = AWS_BUCKET_NAME,
        Key,
        expiresIn = AWS_EXPIRES_IN,
        fileName,
        download
    }: {
        Bucket?: string;
        Key: string;
        fileName?: string;
        download?: string;
        expiresIn?: number;
    }): Promise<string> {
        const command = new GetObjectCommand({
            Bucket,
            Key,
            ResponseContentDisposition: download === "true" ? `attachment; filename="${fileName || Key.split("/").pop()
                }"` : undefined,
        });
        const url = await getSignedUrl(this.client, command, { expiresIn });
        return url;
    }
    async createPreSignedUploadLink({
        Bucket = AWS_BUCKET_NAME,
        path = "general",
        expiresIn = AWS_EXPIRES_IN,
        ContentType,
        OriginalName
    }: {
        Bucket?: string;
        path?: string | undefined;
        ContentType: string;
        OriginalName: string;
        expiresIn?: number;
    }): Promise<{ url: string, Key: string }> {
        const command = new PutObjectCommand({
            Bucket,
            Key: `${APP_NAME}/${path}/${randomUUID()}__${OriginalName}`,
            ContentType,
        });
        if (!command.input?.Key) {
            throw new BadRequestException("Fail to upload");
        }
        const url = await getSignedUrl(this.client, command, { expiresIn });
        return { url, Key: command.input.Key }
    }

    async getAsset({
        Bucket = AWS_BUCKET_NAME,
        Key,
    }: {
        Bucket?: string;
        Key: string;
    }): Promise<GetObjectCommandOutput> {
        const command = new GetObjectCommand({
            Bucket,
            Key,

        });
        return await this.client.send(command);
    }

    //DELETE
    async deleteAsset({
        Bucket = AWS_BUCKET_NAME,
        Key,
    }: {
        Bucket?: string;
        Key: string;
    }): Promise<DeleteObjectCommandOutput> {
        const command = new DeleteObjectCommand({
            Bucket,
            Key,

        });
        return await this.client.send(command);
    }
    async deleteAssets({
        Bucket = AWS_BUCKET_NAME,
        Keys,
    }: {
        Bucket?: string;
        Keys: { Key: string }[];
    }): Promise<DeleteObjectsCommandOutput> {
        //week17 pt.2 vid 10 5:42
        const command = new DeleteObjectsCommand({
            Bucket,
            Delete: {
                Objects: Keys,
                Quiet: false
            },

        });
        return await this.client.send(command);
    }

    async listFolderDir({
        Bucket = AWS_BUCKET_NAME,
        prefix,
    }: {
        Bucket?: string;
        prefix: string;
    }): Promise<ListObjectsV2CommandOutput> {
        const command = new ListObjectsV2Command({
            Bucket,
            Prefix: `${APP_NAME}/${prefix}`,

        });
        return await this.client.send(command);
    }
    async deleteFolderByPrefix({
        Bucket = AWS_BUCKET_NAME,
        prefix,
    }: {
        Bucket?: string;
        prefix: string;
    }): Promise<ListObjectsV2CommandOutput> {
        const result = await this.listFolderDir({
            Bucket,
            prefix
        });
        const Keys = result.Contents?.map(ele => { return { Key: ele.Key } }) as { Key: string }[];

        return await this.deleteAssets({ Bucket, Keys });
    }
}
export const s3Service = new S3Service();
