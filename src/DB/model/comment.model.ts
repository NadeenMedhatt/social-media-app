import { HydratedDocument, model, models, Schema } from "mongoose";
import { IComment } from "../../common/interfaces";
import { Types } from "mongoose";
import { reactionSchema } from "./post.model";




const commentSchema = new Schema<IComment>({
    folderId: {
        type: String,
        required: [true, "folderId Is Required"],

    },
    content: {
        type: String,
        required: function (this) {
            return !this.attachments?.length
        }

    },
    attachments: {
        type: [String],
    },
    likes: {
        type: [reactionSchema],
        default: [],
    },
    tags: [{
        type: Types.ObjectId,
        ref: "User"
    }],

    postId: {
        type: Types.ObjectId,
        ref: "Post",
        required: true,
    },
    commentId: {
        type: Types.ObjectId,
        ref: "Comment",
    },
    createdBy: {
        type: Types.ObjectId,
        ref: "User",
        required: true,
    },
    updatedBy: {
        type: Types.ObjectId,
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

})

commentSchema.virtual("replies", {
    localField: "_id",
    foreignField: "commentId",
    ref: "Comment",
    justOne: true
})


commentSchema.pre(["findOne", "find", 'countDocuments'], function () {

    const query = this.getQuery();

    if (query.paranoid === false) {

        this.setQuery({ ...query });
    } else {

        this.setQuery({ ...query, deletedAt: { $exists: false } });
    }

});
commentSchema.pre(["updateOne", "findOneAndUpdate"], function () {

    const update = this.getUpdate() as HydratedDocument<IComment>;

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
    } else {

        this.setQuery({ deletedAt: { $exists: false }, ...query });
    }

});
commentSchema.pre(["deleteOne", "findOneAndDelete"], function () {



    const query = this.getQuery();
    console.log({ query });

    if (query.force === true) {

        this.setQuery({ ...query });
    } else {

        this.setQuery({ deletedAt: { $exists: true }, ...query });
    }

});

export const CommentModel = models.Comment || model<IComment>("Comment", commentSchema);

