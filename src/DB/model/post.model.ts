import { HydratedDocument, model, models, Schema } from "mongoose";
import { AvailabilityEnum, ReactEnum } from "../../common/enums";
import { IPost, IReaction } from "../../common/interfaces";
import { Types } from "mongoose";


export const reactionSchema = new Schema<IReaction>(
    {
        userId: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
        },
        react: {
            type: Number,
            enum: ReactEnum,

            required: true,
        },
    },
    { _id: false }
);

const postSchema = new Schema<IPost>({
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
    availability: {
        type: Number,
        enum: AvailabilityEnum,
        default: AvailabilityEnum.PUBLIC
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
    collection: "SOCIAL_APP_Posts",
    toJSON: {
        virtuals: true,
    },
    toObject: {
        virtuals: true,
    }

})


postSchema.virtual("comments", {
    localField: "_id",
    foreignField: "postId",
    ref: "Comment",
    justOne: true
})

postSchema.pre(["findOne", "find", 'countDocuments'], function () {

    const query = this.getQuery();

    if (query.paranoid === false) {

        this.setQuery({ ...query });
    } else {

        this.setQuery({ ...query, deletedAt: { $exists: false } });
    }

});
postSchema.pre(["updateOne", "findOneAndUpdate"], function () {

    const update = this.getUpdate() as HydratedDocument<IPost>;

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
postSchema.pre(["deleteOne", "findOneAndDelete"], function () {



    const query = this.getQuery();

    if (query.force === true) {

        this.setQuery({ ...query });
    } else {

        this.setQuery({ deletedAt: { $exists: true }, ...query });
    }

});

export const PostModel = models.Post || model<IPost>("Post", postSchema);

