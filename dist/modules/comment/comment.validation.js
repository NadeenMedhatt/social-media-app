"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listComment = exports.deleteComment = exports.reactOnComment = exports.updateComment = exports.createReplyComment = exports.createComment = void 0;
const zod_1 = require("zod");
const validation_1 = require("../../common/validation");
const enums_1 = require("../../common/enums");
const multer_1 = require("../../common/utils/multer");
exports.createComment = {
    params: zod_1.z.strictObject({
        postId: validation_1.generalValidationFields.id,
    }),
    body: zod_1.z.strictObject({
        content: zod_1.z.string().optional(),
        files: zod_1.z.array(validation_1.generalValidationFields.files(multer_1.fileFieldValidation.image)).optional(),
        tags: zod_1.z.array(validation_1.generalValidationFields.id).optional(),
    }).superRefine((args, ctx) => {
        if (!args.files?.length && !args.content) {
            ctx.addIssue({
                code: "custom",
                path: ["content"],
                message: "Content Is Required"
            });
        }
        if (args.tags?.length) {
            const uniqueTags = [...new Set(args.tags)];
            if (uniqueTags.length != args.tags.length) {
                ctx.addIssue({
                    code: "custom",
                    path: ["tags"],
                    message: "Duplicated Tag"
                });
            }
        }
    })
};
exports.createReplyComment = {
    params: zod_1.z.strictObject({
        postId: validation_1.generalValidationFields.id,
        commentId: validation_1.generalValidationFields.id,
    }),
    body: exports.createComment.body
};
exports.updateComment = {
    params: zod_1.z.strictObject({
        commentId: validation_1.generalValidationFields.id,
        postId: validation_1.generalValidationFields.id,
    }),
    body: zod_1.z.strictObject({
        content: zod_1.z.string().optional(),
        files: zod_1.z.array(validation_1.generalValidationFields.files(multer_1.fileFieldValidation.image)).optional(),
        tags: zod_1.z.array(validation_1.generalValidationFields.id).optional(),
        availability: zod_1.z.coerce.number().default(enums_1.AvailabilityEnum.PUBLIC).optional(),
        removeFiles: zod_1.z.array(zod_1.z.string()).optional(),
        removeTags: zod_1.z.array(validation_1.generalValidationFields.id).optional(),
    }).superRefine((args, ctx) => {
        if (!Object.values(args).length) {
            ctx.addIssue({
                code: "custom",
                message: "Cannot accept all field empty"
            });
        }
        if (args.tags?.length) {
            const uniqueTags = [...new Set(args.tags)];
            if (uniqueTags.length != args.tags.length) {
                ctx.addIssue({
                    code: "custom",
                    path: ["tags"],
                    message: "Duplicated Tag"
                });
            }
        }
    })
};
exports.reactOnComment = {
    params: zod_1.z.strictObject({
        commentId: validation_1.generalValidationFields.id,
        postId: validation_1.generalValidationFields.id,
    }),
    query: zod_1.z.strictObject({
        react: zod_1.z.coerce.number(),
    })
};
exports.deleteComment = {
    params: zod_1.z.strictObject({
        postId: validation_1.generalValidationFields.id,
        commentId: validation_1.generalValidationFields.id,
    }),
};
exports.listComment = {
    params: zod_1.z.strictObject({
        postId: validation_1.generalValidationFields.id,
    }),
    query: validation_1.paginationValidationSchema.query
};
