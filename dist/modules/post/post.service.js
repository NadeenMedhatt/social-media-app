"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postService = void 0;
const mongoose_1 = require("mongoose");
const services_1 = require("../../common/services");
const post_repository_1 = require("../../DB/repository/post.repository");
const user_repository_1 = require("../../DB/repository/user.repository");
const exceptions_1 = require("../../common/exceptions");
const node_crypto_1 = require("node:crypto");
class PostService {
    userRepository;
    redis;
    notification;
    postRepository;
    s3;
    constructor() {
        this.userRepository = new user_repository_1.UserRepository();
        this.redis = services_1.redisService;
        this.notification = services_1.notificationService;
        this.postRepository = new post_repository_1.PostRepository();
        this.s3 = new services_1.S3Service();
    }
    async createPost({ availability, content, files, tags, }, user) {
        const mentions = [];
        const FCM_Tokens = [];
        if (tags?.length) {
            const mentionedAccounts = await this.userRepository.find({
                filter: {
                    _id: { $in: tags }
                }
            });
            if (mentionedAccounts.length != tags.length) {
                throw new exceptions_1.NotFoundException("fail to find some or all mentioned accounts");
            }
            for (const tag of tags) {
                mentions.push(mongoose_1.Types.ObjectId.createFromHexString(tag));
                (await this.redis.getFCMs(tag) || []).map(token => FCM_Tokens.push(token));
            }
        }
        const folderId = (0, node_crypto_1.randomUUID)();
        let attachments = [];
        if (files?.length) {
            attachments = await this.s3.uploadFiles({
                files: files,
                path: `post/${folderId}`
            });
        }
        const post = await this.postRepository.createOne({
            data: {
                createdBy: user._id,
                content: content,
                folderId,
                attachments,
                availability,
                tags: mentions,
            }
        });
        if (!post) {
            if (attachments.length) {
                await this.s3.deleteAssets({
                    Keys: attachments.map(ele => {
                        return { Key: ele };
                    })
                });
            }
            throw new exceptions_1.BadRequestException("Fail");
        }
        if (FCM_Tokens.length) {
            await this.notification.sendNotifications({
                tokens: FCM_Tokens,
                data: {
                    title: "Post Mention",
                    body: JSON.stringify({
                        message: `${user.username} mentioned you in his post`,
                        postId: post._id
                    })
                }
            });
        }
        return post.toJSON();
    }
}
exports.postService = new PostService();
