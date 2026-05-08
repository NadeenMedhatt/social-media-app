import { HydratedDocument, model, models, Schema } from "mongoose";
import { GenderEnum, ProviderEnum, RoleEnum } from "../../common/enums";
import { IUser } from "../../common/interfaces";
import { BadRequestException } from "../../common/exceptions";
import { generateEncryption, generateHash } from "../../common/utils/security";




const userSchema = new Schema<IUser>({
    firstName: {
        type: String,
        required: [true, "firstName Is Required"],
        minLength: 2,
        maxLength: 25,
    },
    lastName: {
        type: String,
        required: [true, "lastName Is Required"],
        minLength: 2,
        maxLength: 25,
    },

    email: {
        type: String,
        unique: true,
        required: [true, "Email Is Required"],
    },
    password: {
        type: String,
        required: function (this) {
            return this.provider == ProviderEnum.SYSTEM;
        },
    },
    bio: {
        type: String,
        maxLength: 200,
    },
    phone: {
        type: String,
        required: [true, "Phone Is Required"],
    },
    ProfileImage: {
        type: String,
    },
    coverImages: {
        type: [String],
    },
    DOB: {
        type: Date,
    },
    confirmedEmail: {
        type: Date,
    },
    changeCredentialsTime: {
        type: Date,
    },
    provider: {
        type: Number,
        enum: ProviderEnum,
        default: ProviderEnum.SYSTEM
    },
    gender: {
        type: Number,
        enum: GenderEnum,
        default: GenderEnum.MALE
    },
    role: {
        type: Number,
        enum: RoleEnum,
        default: RoleEnum.USER,
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
    collection: "SOCIAL_APP_Users",
    toJSON: {
        virtuals: true,
    },
    toObject: {
        virtuals: true,
    }

})

userSchema.virtual("username").get(function (this: IUser) {
    return `${this.firstName} ${this.lastName}`;
}).set(function (this: IUser, value: string) {
    const [firstName, lastName] = value.split(" ");
    this.firstName = firstName as string;
    this.lastName = lastName as string;
}).get(function () {
    return `${this.firstName} ${this.lastName}`;
})
// userSchema.pre("validate", function () {

//     if (this.password && this.provider == ProviderEnum.GOOGLE) {
//         throw new BadRequestException("Google account can't have password");
//     }
// });
userSchema.pre("save", async function (this: HydratedDocument<IUser> & { wasNew: boolean }) {


    this.wasNew = this.isNew;
    if (this.isModified("password")) {
        this.password = await generateHash({ plaintext: this.password });
    }

    if (this.phone && this.isModified("phone")) {
        this.phone = await generateEncryption(this.phone);
    }

});

userSchema.pre(["findOne", "find"], function () {

    const query = this.getQuery();

    if (query.paranoid === false) {

        this.setQuery({ ...query });
    } else {

        this.setQuery({ ...query, deletedAt: { $exists: false } });
    }

});
userSchema.pre(["updateOne", "findOneAndUpdate"], function () {

    const update = this.getUpdate() as HydratedDocument<IUser>;

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
userSchema.pre(["deleteOne", "findOneAndDelete"], function () {

    
    
    const query = this.getQuery();
    console.log({query});

    if (query.force === true) {

        this.setQuery({ ...query });
    } else {

        this.setQuery({ deletedAt: { $exists: true }, ...query });
    }

});

// userSchema.post("save", async function () {
//     const that = this as HydratedDocument<IUser> & { wasNew: boolean };
//     if (that.wasNew) {
//         await sendEmail({
//             to: this.email,
//             subject: EmailEnum.ConfirmEmail,
//             html: "16515",
//         });
//     }

// });
export const UserModel = models.User || model<IUser>("User", userSchema);

