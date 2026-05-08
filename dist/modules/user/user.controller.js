"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const response_1 = require("../../common/response");
const user_service_1 = __importDefault(require("./user.service"));
const middleware_1 = require("../../middleware");
const user_authorization_1 = require("./user.authorization");
const enums_1 = require("../../common/enums");
const multer_1 = require("../../common/utils/multer");
const router = (0, express_1.Router)();
router.get("/", (0, middleware_1.authentication)(), (0, middleware_1.authorization)(user_authorization_1.endpoint.profile), async (req, res, next) => {
    const data = await user_service_1.default.profile(req.user);
    return (0, response_1.successResponse)({
        res,
        status: 201,
        data
    });
});
router.patch("/profile-image", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await user_service_1.default.profileImage(req.body, req.user);
    return (0, response_1.successResponse)({
        res,
        data
    });
});
router.patch("/profile-cover-images", (0, middleware_1.authentication)(), (0, multer_1.cloudFileUpload)({
    storageApproach: enums_1.StorageApproachEnum.DISK,
    validation: multer_1.fileFieldValidation.image,
    maxSize: 5
}).array("attachments", 2), async (req, res, next) => {
    const data = await user_service_1.default.profileCoverImages(req.files, req.user);
    return (0, response_1.successResponse)({
        res,
        status: 200,
        data
    });
});
router.post("/logout", (0, middleware_1.authentication)(), async (req, res, next) => {
    const status = await user_service_1.default.logout(req.body, req.user, req.decode);
    return (0, response_1.successResponse)({
        res,
        message: "Done",
        status,
    });
});
router.delete("/", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await user_service_1.default.deleteProfile(req.user);
    return (0, response_1.successResponse)({
        res,
        data
    });
});
router.post("/rotate", (0, middleware_1.authentication)(enums_1.TokenTypeEnum.REFRESH), async (req, res, next) => {
    const credentials = await user_service_1.default.rotateToken(req.user, req.decode, `${req.protocol}://${req.host}`);
    return (0, response_1.successResponse)({
        res,
        message: "Done",
        status: 201,
        data: { ...credentials },
    });
});
exports.default = router;
