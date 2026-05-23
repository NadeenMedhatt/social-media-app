"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentModel = void 0;
const mongoose_1 = require("mongoose");
const mongoose_2 = require("mongoose");
const post_model_1 = require("./post.model");
const commentSchema = new mongoose_1.Schema({
    folderId: {
        type: String,
        required: [true, "folderId Is Required"],
    },
    content: {
        type: String,
        required: function () {
            return !this.attachments?.length;
        }
    },
    attachments: {
        type: [String],
    },
    likes: {
        type: [post_model_1.reactionSchema],
        default: [],
    },
    tags: [{
            type: mongoose_2.Types.ObjectId,
            ref: "User"
        }],
    postId: {
        type: mongoose_2.Types.ObjectId,
        ref: "Post",
        required: true,
    },
    commentId: {
        type: mongoose_2.Types.ObjectId,
        ref: "Comment",
    },
    createdBy: {
        type: mongoose_2.Types.ObjectId,
        ref: "User",
        required: true,
    },
    updatedBy: {
        type: mongoose_2.Types.ObjectId,
        ref: "User"
    },
    deletedAt: {
        type: Date,
    },
    restoredAt: {
        type: Date,
    },
}, {
    timestamps: true,
    strict: true,
    strictQuery: true,
    collection: "SOCIAL_APP_Comments",
    toJSON: {
        virtuals: true,
    },
    toObject: {
        virtuals: true,
    }
});
commentSchema.virtual("replies", {
    localField: "_id",
    foreignField: "commentId",
    ref: "Comment",
    justOne: true
});
commentSchema.pre(["findOne", "find", 'countDocuments'], function () {
    const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ ...query, deletedAt: { $exists: false } });
    }
});
commentSchema.pre(["updateOne", "findOneAndUpdate"], function () {
    const update = this.getUpdate();
    if (update.deletedAt) {
        this.setUpdate({ ...update, $unset: { restoredAt: 1 } });
    }
    if (update.restoredAt) {
        this.setUpdate({ ...update, $unset: { deletedAt: 1 } });
        this.setQuery({ ...this.getQuery(), deletedAt: { $exists: true } });
    }
    const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ deletedAt: { $exists: false }, ...query });
    }
});
commentSchema.pre(["deleteOne", "findOneAndDelete"], function () {
    const query = this.getQuery();
    console.log({ query });
    if (query.force === true) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ deletedAt: { $exists: true }, ...query });
    }
});
exports.CommentModel = mongoose_1.models.Comment || (0, mongoose_1.model)("Comment", commentSchema);
