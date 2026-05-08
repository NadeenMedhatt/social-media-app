"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmEmail = exports.resendConfirmEmail = exports.signup = exports.login = void 0;
const zod_1 = require("zod");
const validation_1 = require("../../common/validation");
exports.login = {
    body: zod_1.z.strictObject({
        email: validation_1.generalValidationFields.email,
        password: validation_1.generalValidationFields.password,
        FCM: zod_1.z.string().optional(),
    })
};
exports.signup = {
    body: exports.login.body.safeExtend({
        username: validation_1.generalValidationFields.username,
        phone: validation_1.generalValidationFields.phone,
        confirmPassword: validation_1.generalValidationFields.confirmPassword,
    }).refine((data) => {
        return data.password === data.confirmPassword;
    }, { error: "Confirm Password must match Password" })
};
exports.resendConfirmEmail = {
    body: zod_1.z.strictObject({
        email: validation_1.generalValidationFields.email,
    })
};
exports.confirmEmail = {
    body: exports.resendConfirmEmail.body.safeExtend({
        otp: validation_1.generalValidationFields.otp,
    })
};
