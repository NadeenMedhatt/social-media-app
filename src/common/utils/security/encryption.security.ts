import crypto from "node:crypto";
import { ENC_SECRET_KEY, IV_LENGTH } from "../../../config/config";
import { BadRequestException } from "../../exceptions";
export const generateEncryption = async (plainText: string): Promise<string> => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    ENC_SECRET_KEY,
    iv,
  );
  let encryptedData = cipher.update(plainText, "utf-8", "hex");
  encryptedData += cipher.final("hex");
  return `${iv.toString("hex")}:${encryptedData}`;
};
export const generateDecryption = async (cipherText: string): Promise<string> => {
  const [iv, encryptedText] = (cipherText.split(":") || []) as string[];
  if (!iv || !encryptedText) {
    throw new BadRequestException("Fail to encrypt")
  }
  const binaryLikeIv = Buffer.from(iv, "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    ENC_SECRET_KEY,
    binaryLikeIv,
  );
  let decryptedData = decipher.update(encryptedText, "hex", "utf-8");

  decryptedData += decipher.final("utf-8");
  return decryptedData;
};
