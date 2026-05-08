import { z } from "zod";
import { generalValidationFields } from "../../common/validation";

export const login = {
    body: z.strictObject({
        email: generalValidationFields.email,
        password: generalValidationFields.password,
        FCM: z.string().optional(),
    })
};

export const signup = {
    body: login.body.safeExtend({
        username: generalValidationFields.username,
        phone: generalValidationFields.phone,
        confirmPassword: generalValidationFields.confirmPassword,
    }).refine((data) => {
        return data.password === data.confirmPassword;
    }, { error: "Confirm Password must match Password" })

    // .superRefine((data, ctx) => {
    //     if (data.password !== data.confirmPassword) {
    //         ctx.addIssue({
    //             path: ["confirmPassword"],
    //             message: "Confirm Password must match Password",
    //             code: "custom"
    //         })
    //     }
    // })


}
export const resendConfirmEmail = {
    body: z.strictObject({
        email: generalValidationFields.email,

    })

}
export const confirmEmail = {
    body: resendConfirmEmail.body.safeExtend({
        otp: generalValidationFields.otp,

    })

}