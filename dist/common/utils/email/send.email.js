"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("../../../config/config");
const sendEmail = async ({ to, cc, bcc, subject, html, attachments = [], }) => {
    try {
        const transporter = nodemailer_1.default.createTransport({
            service: "gmail",
            auth: {
                user: config_1.EMAIL_APP,
                pass: config_1.EMAIL_APP_PASSWORD,
            },
        });
        const info = await transporter.sendMail({
            from: `"${config_1.APP_NAME}" <${config_1.EMAIL_APP}>`,
            to,
            cc,
            bcc,
            subject,
            html,
            attachments,
        });
        console.log("Message sent:", info.messageId);
    }
    catch (error) {
        console.log("Fail To Send Email:", error);
    }
};
exports.sendEmail = sendEmail;
