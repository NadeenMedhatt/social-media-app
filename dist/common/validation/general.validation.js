"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalValidationFields = void 0;
const zod_1 = require("zod");
exports.generalValidationFields = {
    email: zod_1.z.email(),
    password: zod_1.z.string().regex(/^(?=.*[a-z]){1,}(?=.*[A-Z]){1,}(?=.*\d){1,}(?=.*\W){1,}[\w\W\d].{8,25}$/, { error: "Password must be at least 6 characters long and contain at least one letter and one number" }),
    phone: zod_1.z.string().regex(/^(02|2|\+2)?01[0-25]\d{8}$/, { error: "phone not valid" }),
    otp: zod_1.z.string().regex(/^\d{6}/, { error: "otp not valid" }),
    username: zod_1.z.string({ error: "User Name Is Mandatory" }).min(2, { error: "User Name Must Be At Least 2 Characters" }).max(25, { error: "User Name Must Be At Most 25 Characters" }),
    gender: zod_1.z.enum(["male", "female"], { error: "Gender must be 'male', 'female'" }),
    confirmPassword: zod_1.z.string(),
    files: function (mimetype) {
        return zod_1.z.strictObject({
            fieldname: zod_1.z.string(),
            originalname: zod_1.z.string(),
            encoding: zod_1.z.string(),
            mimetype: zod_1.z.enum(mimetype),
            buffer: zod_1.z.any().optional(),
            path: zod_1.z.string().optional(),
            destination: zod_1.z.string().optional(),
            filename: zod_1.z.string().optional(),
            size: zod_1.z.number()
        }).superRefine((args, ctx) => {
            if (!args.path && !args.buffer) {
                ctx.addIssue({
                    code: "custom",
                    path: ["buffer"],
                    message: "buffer Is Required"
                });
            }
        });
    }
};
