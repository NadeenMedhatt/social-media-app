"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validation = void 0;
const exceptions_1 = require("../common/exceptions");
const validation = (schema) => {
    return (req, res, next) => {
        const validationErrors = [];
        for (const key of Object.keys(schema)) {
            if (!schema[key])
                continue;
            if (req.file) {
                req.body.file = req.file;
            }
            if (req.files) {
                req.body.files = req.files;
            }
            const validationResult = schema[key].safeParse(req[key]);
            if (!validationResult.success) {
                const error = validationResult.error;
                validationErrors.push({
                    key, issues: error.issues.map(({ message, path }) => {
                        return { message, path };
                    })
                });
            }
        }
        if (validationErrors.length > 0) {
            throw new exceptions_1.BadRequestException("Validation Error", validationErrors);
        }
        next();
    };
};
exports.validation = validation;
