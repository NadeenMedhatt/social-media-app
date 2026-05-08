import type { NextFunction, Request, Response } from "express"
import { BadRequestException } from "../common/exceptions";
import { ZodError, ZodType } from "zod";

type keyRequestType = keyof Request;
type ValidationSchemaType = Partial<Record<keyRequestType, ZodType>>;
type ValidationErrorsType = Array<{
    key: keyRequestType;
    issues: Array<{
        message: string;
        path: Array<string | number | undefined | symbol>
    }>
}>;
export const validation = (schema: ValidationSchemaType) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const validationErrors: ValidationErrorsType = [];
        for (const key of Object.keys(schema) as keyRequestType[]) {
            if (!schema[key]) continue;
            if (req.file) {
                req.body.file = req.file;
            }
            if (req.files) {
                req.body.files = req.files;
            }
            const validationResult = schema[key].safeParse(req[key]);
            if (!validationResult.success) {
                const error = validationResult.error as ZodError;
                validationErrors.push({
                    key, issues: error.issues.map(({ message, path }) => {
                        return { message, path }
                    })
                });
            }
        }
        if (validationErrors.length > 0) {
            throw new BadRequestException("Validation Error", validationErrors);
        }
        next();
    }
}