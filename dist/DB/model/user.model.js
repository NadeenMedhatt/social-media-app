"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const mongoose_1 = require("mongoose");
const enums_1 = require("../../common/enums");
const security_1 = require("../../common/utils/security");
const mongoose_2 = require("mongoose");
const userSchema = new mongoose_1.Schema({
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
    friends: [{
            type: mongoose_2.Types.ObjectId,
            ref: "User",
        }],
    password: {
        type: String,
        required: function () {
            return this.provider == enums_1.ProviderEnum.SYSTEM;
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
        enum: enums_1.ProviderEnum,
        default: enums_1.ProviderEnum.SYSTEM
    },
    gender: {
        type: Number,
        enum: enums_1.GenderEnum,
        default: enums_1.GenderEnum.MALE
    },
    role: {
        type: Number,
        enum: enums_1.RoleEnum,
        default: enums_1.RoleEnum.USER,
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
});
userSchema.virtual("username").get(function () {
    return `${this.firstName} ${this.lastName}`;
}).set(function (value) {
    const [firstName, lastName] = value.split(" ");
    this.firstName = firstName;
    this.lastName = lastName;
}).get(function () {
    return `${this.firstName} ${this.lastName}`;
});
userSchema.pre("save", async function () {
    this.wasNew = this.isNew;
    if (this.isModified("password")) {
        this.password = await (0, security_1.generateHash)({ plaintext: this.password });
    }
    if (this.phone && this.isModified("phone")) {
        this.phone = await (0, security_1.generateEncryption)(this.phone);
    }
});
userSchema.pre(["findOne", "find"], function () {
    const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ ...query, deletedAt: { $exists: false } });
    }
});
userSchema.pre(["updateOne", "findOneAndUpdate"], function () {
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
userSchema.pre(["deleteOne", "findOneAndDelete"], function () {
    const query = this.getQuery();
    console.log({ query });
    if (query.force === true) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ deletedAt: { $exists: true }, ...query });
    }
});
exports.UserModel = mongoose_1.models.User || (0, mongoose_1.model)("User", userSchema);
