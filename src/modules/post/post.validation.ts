import { z } from "zod";
import { generalValidationFields } from "../../common/validation";
import { AvailabilityEnum } from "../../common/enums";
import { Types } from "mongoose";
import { fileFieldValidation } from "../../common/utils/multer";



export const createPost = {
    body: z.strictObject({
        content: z.string().optional(),
        files: z.array(generalValidationFields.files(fileFieldValidation.image)).optional(),
        tags: z.array(z.string()).optional(),
        availability: z.coerce.number().default(AvailabilityEnum.PUBLIC),
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
            for (const tag of args.tags) {
                if (!Types.ObjectId.isValid(tag)) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["tags"],
                        message: `Invalid Tagged objectId ${tag}`
                    })
                }
            }

        }
    })
};
export const updatePost = {
    params: z.strictObject({
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
export const deletePost = {
    params: z.strictObject({
        postId: generalValidationFields.id,
    }),
    // body: z.strictObject({
    //     force: z.boolean(),
    // })
};
export const reactOnPost = {
    params: z.strictObject({
        postId: generalValidationFields.id,
    }),
    query: z.strictObject({

        react: z.coerce.number(),

    })
};




