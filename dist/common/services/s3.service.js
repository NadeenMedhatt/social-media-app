"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Service = exports.S3Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const config_1 = require("../../config/config");
const enums_1 = require("../enums");
const node_fs_1 = require("node:fs");
const exceptions_1 = require("../exceptions");
const node_crypto_1 = require("node:crypto");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
class S3Service {
    client;
    constructor() {
        this.client = new client_s3_1.S3Client({
            region: config_1.AWS_REGION,
            credentials: {
                accessKeyId: config_1.AWS_ACCESS_KEY_ID,
                secretAccessKey: config_1.AWS_SECRET_ACCESS_KEY
            }
        });
    }
    async uploadFile({ storeApproach = enums_1.StorageApproachEnum.MEMORY, Bucket = config_1.AWS_BUCKET_NAME, path = "general", ACL = "private", file, ContentType }) {
        const command = new client_s3_1.PutObjectCommand({
            Bucket,
            Key: `${config_1.APP_NAME}/${path}/${(0, node_crypto_1.randomUUID)()}__${file.originalname}`,
            ACL,
            Body: storeApproach === enums_1.StorageApproachEnum.MEMORY ? file.buffer : (0, node_fs_1.createReadStream)(file.path),
            ContentType: file.mimetype || ContentType,
        });
        if (!command.input?.Key) {
            throw new exceptions_1.BadRequestException("Fail to upload", { file });
        }
        await this.client.send(command);
        return command.input.Key;
    }
    async uploadLargeFile({ storeApproach = enums_1.StorageApproachEnum.MEMORY, Bucket = config_1.AWS_BUCKET_NAME, path = "general", ACL = "private", file, ContentType, partSize = 5 }) {
        const upload = new lib_storage_1.Upload({
            client: this.client,
            params: {
                Bucket,
                Key: `${config_1.APP_NAME}/${path}/${(0, node_crypto_1.randomUUID)()}__${file.originalname}`,
                ACL,
                Body: storeApproach === enums_1.StorageApproachEnum.MEMORY
                    ? file.buffer
                    : (0, node_fs_1.createReadStream)(file.path),
                ContentType: ContentType || file.mimetype,
            },
            partSize: partSize * 1024 * 1024,
        });
        upload.on("httpUploadProgress", (progress) => {
            console.log(`File upload progress is :::  ${(progress.loaded / progress.total) * 100} %`);
        });
        return await upload.done();
    }
    async uploadFiles({ storeApproach = enums_1.StorageApproachEnum.MEMORY, uploadApproach = enums_1.uploadApproachEnum.SMALL, Bucket = config_1.AWS_BUCKET_NAME, path = "general", ACL = "private", files, ContentType }) {
        let urls = [];
        if (uploadApproach === enums_1.uploadApproachEnum.LARGE) {
            const data = await Promise.all(files.map((file) => {
                return this.uploadLargeFile({
                    storeApproach, Bucket,
                    path,
                    ACL,
                    file,
                    ContentType: ContentType || file.mimetype,
                });
            }));
            urls = data.map((item) => item.Key);
        }
        else {
            urls = await Promise.all(files.map((file) => {
                return this.uploadFile({
                    storeApproach, Bucket,
                    path,
                    ACL,
                    file,
                    ContentType: ContentType || file.mimetype,
                });
            }));
        }
        return urls;
    }
    ;
    async createPreSignedFetchLink({ Bucket = config_1.AWS_BUCKET_NAME, Key, expiresIn = config_1.AWS_EXPIRES_IN, fileName, download }) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket,
            Key,
            ResponseContentDisposition: download === "true" ? `attachment; filename="${fileName || Key.split("/").pop()}"` : undefined,
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(this.client, command, { expiresIn });
        return url;
    }
    async createPreSignedUploadLink({ Bucket = config_1.AWS_BUCKET_NAME, path = "general", expiresIn = config_1.AWS_EXPIRES_IN, ContentType, OriginalName }) {
        const command = new client_s3_1.PutObjectCommand({
            Bucket,
            Key: `${config_1.APP_NAME}/${path}/${(0, node_crypto_1.randomUUID)()}__${OriginalName}`,
            ContentType,
        });
        if (!command.input?.Key) {
            throw new exceptions_1.BadRequestException("Fail to upload");
        }
        const url = await (0, s3_request_presigner_1.getSignedUrl)(this.client, command, { expiresIn });
        return { url, Key: command.input.Key };
    }
    async getAsset({ Bucket = config_1.AWS_BUCKET_NAME, Key, }) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket,
            Key,
        });
        return await this.client.send(command);
    }
    async deleteAsset({ Bucket = config_1.AWS_BUCKET_NAME, Key, }) {
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket,
            Key,
        });
        return await this.client.send(command);
    }
    async deleteAssets({ Bucket = config_1.AWS_BUCKET_NAME, Keys, }) {
        const command = new client_s3_1.DeleteObjectsCommand({
            Bucket,
            Delete: {
                Objects: Keys,
                Quiet: false
            },
        });
        return await this.client.send(command);
    }
    async listFolderDir({ Bucket = config_1.AWS_BUCKET_NAME, prefix, }) {
        const command = new client_s3_1.ListObjectsV2Command({
            Bucket,
            Prefix: `${config_1.APP_NAME}/${prefix}`,
        });
        return await this.client.send(command);
    }
    async deleteFolderByPrefix({ Bucket = config_1.AWS_BUCKET_NAME, prefix, }) {
        const result = await this.listFolderDir({
            Bucket,
            prefix
        });
        const Keys = result.Contents?.map(ele => { return { Key: ele.Key }; });
        return await this.deleteAssets({ Bucket, Keys });
    }
}
exports.S3Service = S3Service;
exports.s3Service = new S3Service();
