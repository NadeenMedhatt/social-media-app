"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = void 0;
const successResponse = ({ res, message = "Success", status = 200, data }) => {
    return res.status(status).json({
        message,
        status,
        data
    });
};
exports.successResponse = successResponse;
