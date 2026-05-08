"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDecryption = exports.generateEncryption = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const config_1 = require("../../../config/config");
const exceptions_1 = require("../../exceptions");
const generateEncryption = async (plainText) => {
    const iv = node_crypto_1.default.randomBytes(config_1.IV_LENGTH);
    const cipher = node_crypto_1.default.createCipheriv("aes-256-cbc", config_1.ENC_SECRET_KEY, iv);
    let encryptedData = cipher.update(plainText, "utf-8", "hex");
    encryptedData += cipher.final("hex");
    return `${iv.toString("hex")}:${encryptedData}`;
};
exports.generateEncryption = generateEncryption;
const generateDecryption = async (cipherText) => {
    const [iv, encryptedText] = (cipherText.split(":") || []);
    if (!iv || !encryptedText) {
        throw new exceptions_1.BadRequestException("Fail to encrypt");
    }
    const binaryLikeIv = Buffer.from(iv, "hex");
    const decipher = node_crypto_1.default.createDecipheriv("aes-256-cbc", config_1.ENC_SECRET_KEY, binaryLikeIv);
    let decryptedData = decipher.update(encryptedText, "hex", "utf-8");
    decryptedData += decipher.final("utf-8");
    return decryptedData;
};
exports.generateDecryption = generateDecryption;
