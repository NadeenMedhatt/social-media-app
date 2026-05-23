import { z } from "zod";
import { generalValidationFields, paginationValidationSchema } from "../../common/validation";
import { AvailabilityEnum } from "../../common/enums";
import { fileFieldValidation } from "../../common/utils/multer";



export const createComment = {
    params: z.strictObject({
        postId: generalValidationFields.id,
    }),
    body: z.strictObject({
        content: z.string().optional(),
        files: z.array(generalValidationFields.files(fileFieldValidation.image)).optional(),
        tags: z.array(generalValidationFields.id).optional(),
    }).superRefine((args, ctx) => {
        if (!args.files?.length && !args.content) {
            ctx.addIssue({
                code: "custom",
                path: ["content"],
                message: "Content Is Required"
            })
        }

        if (args.tags?.length) {
            const uniqueTags = [...new Set(args.tags)]

            if (uniqueTags.length != args.tags.length) {
                ctx.addIssue({
                    code: "custom",
                    path: ["tags"],
                    message: "Duplicated Tag"
                })
            }
            

        }
    })
};
export const createReplyComment = {
    params: z.strictObject({
        postId: generalValidationFields.id,
        commentId: generalValidationFields.id,
    }),
    body: createComment.body
};
export const updateComment = {
    params: z.strictObject({
        commentId: generalValidationFields.id,
        postId: generalValidationFields.id,

    }),
    body: z.strictObject({
        content: z.string().optional(),
        files: z.array(generalValidationFields.files(fileFieldValidation.image)).optional(),
        tags: z.array(generalValidationFields.id).optional(),
        availability: z.coerce.number().default(AvailabilityEnum.PUBLIC).optional(),
        removeFiles: z.array(z.string()).optional(),
        removeTags: z.array(generalValidationFields.id).optional(),
    }).superRefine((args, ctx) => {

        if (!Object.values(args).length) {
            ctx.addIssue({
                code: "custom",
                message: "Cannot accept all field empty"
            })
        }

        if (args.tags?.length) {
            const uniqueTags = [...new Set(args.tags)]

            if (uniqueTags.length != args.tags.length) {
                ctx.addIssue({
                    code: "custom",
                    path: ["tags"],
                    message: "Duplicated Tag"
                })
            }
            // for (const tag of args.tags) {
            //     if (!Types.ObjectId.isValid(tag)) {
            //         ctx.addIssue({
            //             code: "custom",
            //             path: ["tags"],
            //             message: `Invalid Tagged objectId ${tag}`
            //         })
            //     }
            // }

        }
    })
};
export const reactOnComment = {
    params: z.strictObject({
        commentId: generalValidationFields.id,
        postId: generalValidationFields.id,
    }),
    query: z.strictObject({
        react: z.coerce.number(),

    })
};



export const deleteComment = {
    params: z.strictObject({
        postId: generalValidationFields.id,
        commentId: generalValidationFields.id,
    }),
    // body: z.strictObject({
    //     force: z.boolean(),
    // })
};

export const listComment = {
    params: z.strictObject({
        postId: generalValidationFields.id,

    }),
    query: paginationValidationSchema.query
   
};