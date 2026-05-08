"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorization = exports.authentication = void 0;
const enums_1 = require("../common/enums");
const services_1 = require("../common/services");
const exceptions_1 = require("../common/exceptions");
const authentication = (tokenType = enums_1.TokenTypeEnum.ACCESS) => {
    return async (req, res, next) => {
        const tokenService = new services_1.TokenService();
        const [schema, credentials] = req?.headers.authorization?.split(" ") || [];
        if (!schema || !credentials) {
            throw new exceptions_1.UnAuthorizedException(`missing authentication key or invalid approach`);
        }
        switch (schema) {
            case 'Bearer':
                const { user, decode } = await tokenService.decodeToken({
                    token: credentials,
                    tokenType,
                });
                req.user = user;
                req.decode = decode;
                break;
            default:
                throw new exceptions_1.BadRequestException(`missing authentication schema`);
                break;
        }
        next();
    };
};
exports.authentication = authentication;
const authorization = (accessRoles) => {
    return async (req, res, next) => {
        if (!accessRoles.includes(req.user.role)) {
            throw new exceptions_1.UnAuthorizedException(`Not authorized account`);
        }
        next();
    };
};
exports.authorization = authorization;
