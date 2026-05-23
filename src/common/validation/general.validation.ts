import { Types } from "mongoose";
import { z } from "zod";


export const generalValidationFields = {
    id: z.string().refine(value => { return Types.ObjectId.isValid(value) }, "Invalid Object Id"),
    email: z.email(),
    password: z.string().regex(/^(?=.*[a-z]){1,}(?=.*[A-Z]){1,}(?=.*\d){1,}(?=.*\W){1,}[\w\W\d].{8,25}$/, { error: "Password must be at least 6 characters long and contain at least one letter and one number" }),
    phone: z.string().regex(/^(02|2|\+2)?01[0-25]\d{8}$/, { error: "phone not valid" }),
    otp: z.string().regex(/^\d{6}/, { error: "otp not valid" }),
    username: z.string({ error: "User Name Is Mandatory" }).min(2, { error: "User Name Must Be At Least 2 Characters" }).max(25, { error: "User Name Must Be At Most 25 Characters" }),
    gender: z.enum(["male", "female"], { error: "Gender must be 'male', 'female'" }),
    confirmPassword: z.string(),
    files: function (mimetype: string[]) {
        return z.strictObject({
            fieldname: z.string(),
            originalname: z.string(),
            encoding: z.string(),
            mimetype: z.enum(mimetype),
            buffer: z.any().optional(),
            path: z.string().optional(),
            destination: z.string().optional(),
            filename: z.string().optional(),
            size: z.number()
        }).superRefine((args, ctx) => {
            if (!args.path && !args.buffer) {
                ctx.addIssue({
                    code: "custom",
                    path: ["buffer"],
                    message: "buffer Is Required"
                })
            }
        })
    }
    // file: function (validation = []) {
    // return joi.object().keys({
    //   fieldname: joi.string().required(),
    //   originalname: joi.string().required(),
    //   encoding: joi.string().required(),
    //   mimetype: joi
    //     .string()
    //     .valid(...Object.values(validation))
    //     .required(),
    //   finalPath: joi.string().required(),
    //   destination: joi.string().required(),
    //   filename: joi.string().required(),
    //   path: joi.string().required(),
    //   size: joi.number().required(),
    // });
    //   },
}

export const paginationValidationSchema = {
    query: z.strictObject({
        page: z.coerce.number().optional(),
        size: z.coerce.number().optional(),
    })
}