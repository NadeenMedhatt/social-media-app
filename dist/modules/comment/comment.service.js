"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentService = void 0;
const mongoose_1 = require("./../../common/utils/mongoose");
const mongoose_2 = require("mongoose");
const services_1 = require("../../common/services");
const exceptions_1 = require("../../common/exceptions");
const post_1 = require("../../common/utils/post");
const repository_1 = require("../../DB/repository");
const node_crypto_1 = require("node:crypto");
class CommentService {
    redis;
    userRepository;
    notification;
    commentRepository;
    postRepository;
    s3;
    constructor() {
        this.userRepository = new repository_1.UserRepository();
        this.redis = services_1.redisService;
        this.notification = services_1.notificationService;
        this.commentRepository = new repository_1.CommentRepository();
        this.postRepository = new repository_1.PostRepository();
        this.s3 = new services_1.S3Service();
    }
    async listComment({ postId }, { page, size }, user) {
        const comments = await this.commentRepository.paginate({
            filter: {
                postId: postId,
            },
            options: {
                populate: [{ path: 'postId', match: { $or: (0, post_1.getAvailability)(user) } }, { path: 'replies' }]
            },
            page,
            size
        });
        return comments;
    }
    async createComment({ postId }, { content, files, tags, }, user) {
        const post = await this.postRepository.findOne({
            filter: {
                _id: postId,
                $or: (0, post_1.getAvailability)(user),
            }
        });
        if (!post) {
            throw new exceptions_1.NotFoundException("fal to find matching post");
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
                mentions.push(mongoose_2.Types.ObjectId.createFromHexString(tag));
                (await this.redis.getFCMs(tag) || []).map(token => FCM_Tokens.push(token));
            }
        }
        const postFolderId = post.folderId;
        const commentFolderId = (0, node_crypto_1.randomUUID)();
        let attachments = [];
        if (files?.length) {
            attachments = await this.s3.uploadFiles({
                files: files,
                path: `post/${postFolderId}/comments/${commentFolderId}`
            });
        }
        const comment = await this.commentRepository.createOne({
            data: {
                createdBy: user._id,
                content: content,
                postId: post._id,
                attachments,
                tags: mentions,
                folderId: commentFolderId
            }
        });
        if (!comment) {
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
                    title: "Comment Mention",
                    body: JSON.stringify({
                        message: `${user.username} mentioned you in his comment`,
                        postId: post._id,
                        commentId: comment._id
                    })
                }
            });
        }
        return comment.toJSON();
    }
    async createReplyComment({ postId, commentId }, { content, files, tags, }, user) {
        const comment = await this.commentRepository.findOne({
            filter: {
                _id: commentId,
                postId: postId,
            },
            options: {
                populate: [{ path: 'postId', match: { $or: (0, post_1.getAvailability)(user) } }]
            }
        });
        if (!comment?.postId) {
            throw new exceptions_1.NotFoundException("fal to find matching post");
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
                mentions.push(mongoose_2.Types.ObjectId.createFromHexString(tag));
                (await this.redis.getFCMs(tag) || []).map(token => FCM_Tokens.push(token));
            }
        }
        const post = comment.postId;
        const folderId = post.folderId;
        const commentFolderId = (0, node_crypto_1.randomUUID)();
        let attachments = [];
        if (files?.length) {
            attachments = await this.s3.uploadFiles({
                files: files,
                path: `post/${folderId}/comments/${commentFolderId}`
            });
        }
        const reply = await this.commentRepository.createOne({
            data: {
                createdBy: user._id,
                content: content,
                postId: post._id,
                commentId: comment._id,
                folderId: commentFolderId,
                attachments,
                tags: mentions,
            }
        });
        if (!reply) {
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
                    title: "Comment Mention",
                    body: JSON.stringify({
                        message: `${user.username} mentioned you in his comment`,
                        postId: post._id,
                        commentId: reply._id
                    })
                }
            });
        }
        return reply.toJSON();
    }
    async updateComment({ commentId, postId }, { content, files = [], tags = [], removeFiles = [], removeTags = [] }, user) {
        const comment = await this.commentRepository.findOne({
            filter: {
                _id: commentId,
                createdBy: user._id
            }
        });
        if (!comment) {
            throw new exceptions_1.NotFoundException("Fail To Find Comment");
        }
        if (!content && !comment.content && !files?.length && removeFiles.length == comment.attachments?.length) {
            throw new exceptions_1.BadRequestException("we cannot leave empty comment");
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
        const post = comment.postId;
        const folderId = post.folderId;
        const commentFolderId = comment.folderId;
        let attachments = [];
        if (files?.length) {
            attachments = await this.s3.uploadFiles({
                files: files,
                path: `post/${folderId}/comments/${commentFolderId}`
            });
        }
        const updatedComment = await this.commentRepository.findOneAndUpdate({
            filter: {
                _id: commentId,
                createdBy: user._id
            },
            update: [
                {
                    $set: {
                        content: content ?? comment.content,
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
        if (!updatedComment) {
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
                    title: "Comment Mention",
                    body: JSON.stringify({
                        message: `${user.username} mentioned you in his comment`,
                        commentId: comment._id
                    })
                }
            });
        }
        return updatedComment.toJSON();
    }
    async reactOnComment({ commentId }, { react }, user) {
        react = Number(react);
        const comment = await this.commentRepository.findOne({
            filter: {
                _id: commentId,
            },
            options: {
                populate: [{ path: 'postId', match: { $or: (0, post_1.getAvailability)(user) } }]
            }
        });
        if (!comment?.postId) {
            throw new exceptions_1.NotFoundException("fail to find post");
        }
        const newReact = [];
        const removedReact = [];
        const existingReact = comment.likes?.find((r) => r.userId.toString() == user._id.toString());
        if (!existingReact) {
            newReact.push({ userId: user._id, react });
        }
        else if (existingReact.react === Number(react)) {
            removedReact.push({ userId: user._id, react });
        }
        else {
            removedReact.push({ userId: user._id, react: existingReact.react });
            newReact.push({ userId: user._id, react });
        }
        const updated = await this.commentRepository.findOneAndUpdate({
            filter: {
                _id: commentId,
                $or: (0, post_1.getAvailability)(user)
            },
            update: [
                {
                    $set: {
                        likes: {
                            $setUnion: [
                                {
                                    $setDifference: [
                                        "$likes",
                                        removedReact
                                    ]
                                },
                                newReact
                            ]
                        },
                    }
                }
            ],
        });
        if (!updated) {
            throw new exceptions_1.NotFoundException("Failed to update comment");
        }
        return updated.toJSON();
    }
    async deleteComment({ postId, commentId }, user) {
        const comment = await this.commentRepository.findOne({
            filter: {
                _id: commentId,
                postId: postId,
            },
            options: {
                populate: [{ path: 'postId', match: { $or: (0, post_1.getAvailability)(user) } }]
            }
        });
        if (!comment?.postId) {
            throw new exceptions_1.NotFoundException("fal to find matching post");
        }
        const post = comment.postId;
        const folderId = post.folderId;
        const commentFolderId = comment.folderId;
        const deleteComment = await this.commentRepository.deleteOne({
            filter: {
                _id: commentId,
                createdBy: user._id,
                force: true,
            },
        });
        if (!comment) {
            throw new exceptions_1.NotFoundException('invalid comment');
        }
        await this.commentRepository.deleteMany({
            filter: {
                commentId: commentId
            }
        });
        await this.s3.deleteFolderByPrefix({ prefix: `post/${folderId}/comments/${commentFolderId}` });
        return deleteComment;
    }
}
exports.commentService = new CommentService();
