import { HydratedDocument, model, models, Schema } from "mongoose";
import { AvailabilityEnum, GenderEnum, ProviderEnum, RoleEnum } from "../../common/enums";
import { IPost } from "../../common/interfaces";
import { Types } from "mongoose";




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
    likes: [{
        type: Types.ObjectId,
        ref: "User"
    }],
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




postSchema.pre(["findOne", "find"], function () {

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
    console.log({ query });

    if (query.force === true) {

        this.setQuery({ ...query });
    } else {

        this.setQuery({ deletedAt: { $exists: true }, ...query });
    }

});

export const PostModel = models.Post || model<IPost>("Post", postSchema);

