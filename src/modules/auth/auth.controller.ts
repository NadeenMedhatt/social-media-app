import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import AuthService from "./auth.service";
import { successResponse } from "../../common/response";
import { ILoginResponse, } from "./auth.entity";
import * as validators from "./auth.validation";
import { validation } from "../../middleware";
const router = Router();

router.post(
    "/login", validation(validators.login),
    async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
        const data = await AuthService.login(req.body, `${req.protocol}://${req.host}`);
        return successResponse<ILoginResponse>({
            res,
            data
        });
    },
);

router.post(
    "/signup", validation(validators.signup),
    async (req: Request, res: Response, next: NextFunction): Promise<Response> => {

        const data = await AuthService.signup(req.body);

        return successResponse<any>({
            res,
            status: 201,
            data
        });
    },
);
router.patch(
    "/confirm-email", validation(validators.confirmEmail),
    async (req: Request, res: Response, next: NextFunction): Promise<Response> => {

        
        await AuthService.confirmEmail(req.body);

        return successResponse({ res });
    },
);
router.patch(
    "/resend-confirm-email", validation(validators.resendConfirmEmail),
    async (req: Request, res: Response, next: NextFunction): Promise<Response> => {

        await AuthService.resendConfirmEmail(req.body);

        return successResponse({ res });
    },
);
router.post("/signup/gmail", async (req, res, next) => {
  const { result, status = 201 } = await AuthService.signupWithGmail(
    req.body,
    `${req.protocol}://${req.host}`,
  );

  return successResponse({
    res,
    message: "Done",
    status,
    data: { result },
  });
});

router.post("/login/gmail", async (req, res, next) => {
  const account = await AuthService.loginWithGmail(
    req.body,
    `${req.protocol}://${req.host}`,
  );
  return successResponse({
    res,
    message: "Done",
    status: 200,
    data: { account },
  });
});
export default router;

