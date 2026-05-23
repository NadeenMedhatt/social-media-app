"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postService = void 0;
const mongoose_1 = require("./../../common/utils/mongoose");
const mongoose_2 = require("mongoose");
const services_1 = require("../../common/services");
const exceptions_1 = require("../../common/exceptions");
const node_crypto_1 = require("node:crypto");
const post_1 = require("../../common/utils/post");
const repository_1 = require("../../DB/repository");
class PostService {
    userRepository;
    redis;
    notification;
    postRepository;
    s3;
    constructor() {
        this.userRepository = new repository_1.UserRepository();
        this.redis = services_1.redisService;
        this.notification = services_1.notificationService;
        this.postRepository = new repository_1.PostRepository();
        this.s3 = new services_1.S3Service();
    }
    async listPost({ page, size, search }, user) {
        const posts = await this.postRepository.paginate({
            filter: {
                $or: (0, post_1.getAvailability)(user)
            },
            page,
            size
        });
        return posts;
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
                mentions.push(mongoose_2.Types.ObjectId.createFromHexString(tag));
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
    async updatePost({ postId }, { availability, content, files = [], tags = [], removeFiles = [], removeTags = [] }, user) {
        console.log({ files });
        const post = await this.postRepository.findOne({
            filter: {
                _id: postId,
                createdBy: user._id
            }
        });
        if (!post) {
            throw new exceptions_1.NotFoundException("Fail To Find Post");
        }
        if (!content && !post.content && !files?.length && removeFiles.length == post.attachments?.length) {
            throw new exceptions_1.BadRequestException("we cannot leave empty post");
        }
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
                mentions.push((0, mongoose_1.createObjectId)(tag));
                (await this.redis.getFCMs(tag) || []).map(token => FCM_Tokens.push(token));
            }
        }
        const folderId = post.folderId;
        let attachments = [];
        if (files?.length) {
            attachments = await this.s3.uploadFiles({
                files: files,
                path: `post/${folderId}`
            });
        }
        console.log({ attachments, removeFiles });
        const updatedPost = await this.postRepository.findOneAndUpdate({
            filter: {
                _id: postId,
                createdBy: user._id
            },
            update: [
                {
                    $set: {
                        content: content ?? post.content,
                        availability: availability ?? post.availability,
                        attachments: {
                            $setUnion: [
                                {
                                    $setDifference: [
                                        "$attachments",
                                        removeFiles
                                    ]
                                },
                                attachments
                            ]
                        },
                        tags: {
                            $setUnion: [
                                {
                                    $setDifference: [
                                        "$tags",
                                        removeTags.map(ele => (0, mongoose_1.createObjectId)(ele))
                                    ]
                                },
                                mentions
                            ]
                        },
                    }
                }
            ],
        });
        console.log({ updatedPost });
        if (!updatedPost) {
            if (attachments.length) {
                await this.s3.deleteAssets({
                    Keys: attachments.map(ele => {
                        return { Key: ele };
                    })
                });
            }
            throw new exceptions_1.BadRequestException("Fail");
        }
        if (removeFiles.length) {
            await this.s3.deleteAssets({
                Keys: removeFiles.map(ele => { return { Key: ele }; })
            });
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
        return updatedPost.toJSON();
    }
    async reactOnPost({ postId }, { react }, user) {
        const update = react > 0 ? { $addToSet: { likes: user._id } } : { $pull: { likes: user._id } };
        const post = await this.postRepository.findOneAndUpdate({
            filter: {
                _id: postId,
                $or: (0, post_1.getAvailability)(user)
            },
            update
        });
        if (!post) {
            throw new exceptions_1.NotFoundException("fail to find post");
        }
        return post.toJSON();
    }
}
exports.postService = new PostService();
