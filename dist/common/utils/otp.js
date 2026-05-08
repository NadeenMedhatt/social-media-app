"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNumberOtp = void 0;
const createNumberOtp = () => {
    return Math.floor(Math.random() * 900000 + 100000);
};
exports.createNumberOtp = createNumberOtp;
