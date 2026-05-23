"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = require("./../../common/services");
const enums_1 = require("../../common/enums");
const exceptions_1 = require("../../common/exceptions");
const email_1 = require("../../common/utils/email");
const security_1 = require("../../common/utils/security");
const model_1 = require("../../DB/model");
const utils_1 = require("../../common/utils");
const google_auth_library_1 = require("google-auth-library");
const config_1 = require("../../config/config");
const repository_1 = require("../../DB/repository");
class AuthService {
    userRepository;
    redis;
    tokenService;
    notification;
    constructor() {
        this.userRepository = new repository_1.UserRepository();
        this.redis = services_1.redisService;
        this.tokenService = new services_1.TokenService();
        this.notification = services_1.notificationService;
    }
    async login({ email, password, FCM }, issuer) {
        const user = await this.userRepository.findOne({
            filter: {
                email,
                provider: enums_1.ProviderEnum.SYSTEM,
                confirmedEmail: { $exists: true },
            },
            options: {
                lean: false
            }
        });
        if (!user) {
            console.log('hi');
            throw new exceptions_1.NotFoundException("Invalid Credentials");
        }
        const matchPass = await (0, security_1.compareHash)({
            plaintext: password,
            cipherText: user.password,
        });
        if (!matchPass) {
            console.log('hi1');
            throw new exceptions_1.NotFoundException("Invalid Credentials");
        }
        if (FCM) {
            await this.redis.addFCM(user._id, FCM);
            const tokens = await this.redis.getFCMs(user._id);
            if (tokens.length) {
                await this.notification.sendNotifications({
                    tokens, data: {
                        title: "login",
                        body: `New Login At ${new Date()}`
                    }
                });
            }
        }
        return await this.tokenService.createLoginCredentials({ user, issuer });
    }
    async signup({ username, email, password, phone }) {
        const checkEmailExists = await this.userRepository.findOne({
            filter: { email },
            projection: "email",
            options: { lean: true }
        });
        if (checkEmailExists) {
            throw new exceptions_1.ConflictException("Email Exists");
        }
        const user = await this.userRepository.create({
            model: model_1.UserModel,
            data: {
                username,
                email,
                password,
                phone,
                provider: enums_1.ProviderEnum.SYSTEM,
            },
        });
        await this.sendEmailOtp({
            email,
            subject: enums_1.EmailEnum.ConfirmEmail,
            title: "verify Email",
        });
        return user;
    }
    async sendEmailOtp({ email, subject, title }) {
        const isBlockedTTL = await this.redis.ttl(this.redis.blockOtpKey({ email, subject }));
        if (isBlockedTTL > 0) {
            throw new exceptions_1.BadRequestException(`sorry we cannot request new otp while you are blocked active please try again after ${isBlockedTTL}`);
        }
        const remainingOtpTTL = await this.redis.ttl(this.redis.otpKey({ email, subject }));
        if (remainingOtpTTL > 0) {
            throw new exceptions_1.BadRequestException(`sorry we cannot request new otp while current otp still active please try again after ${remainingOtpTTL}`);
        }
        const maxTrial = await this.redis.get(this.redis.maxAttemptOtpKey({ email, subject }));
        if (maxTrial >= 3) {
            await this.redis.set({
                key: this.redis.blockOtpKey({ email, subject }),
                value: 1,
                ttl: 7 * 60,
            });
            throw new exceptions_1.BadRequestException(`you have reached the max trial`);
        }
        const code = (0, utils_1.createNumberOtp)();
        await this.redis.set({
            key: this.redis.otpKey({ email, subject }),
            value: await (0, security_1.generateHash)({ plaintext: `${code}` }),
            ttl: 120,
        });
        await (0, email_1.sendEmail)({
            to: email,
            subject,
            html: (0, email_1.emailTemplate)({ code, title }),
        });
        await this.redis.incr(this.redis.maxAttemptOtpKey({ email, subject }));
    }
    ;
    async confirmEmail({ email, otp }) {
        const account = await this.userRepository.findOne({
            filter: {
                email,
                confirmedEmail: { $exists: false },
                provider: enums_1.ProviderEnum.SYSTEM,
            },
        });
        if (!account) {
            throw new exceptions_1.NotFoundException("Fail to find account");
        }
        const hashOtp = await this.redis.get(this.redis.otpKey({ email, subject: enums_1.EmailEnum.ConfirmEmail }));
        console.log({ hashOtp });
        if (!hashOtp) {
            throw new exceptions_1.NotFoundException("Expired OTP");
        }
        if (!(await (0, security_1.compareHash)({ plaintext: otp, cipherText: hashOtp }))) {
            throw new exceptions_1.ConflictException("Invalid OTP");
        }
        account.confirmedEmail = new Date();
        await account.save();
        await this.redis.deleteKey(await this.redis.allKeysByPrefix(this.redis.otpKey({ email, subject: enums_1.EmailEnum.ConfirmEmail })));
        return;
    }
    ;
    async resendConfirmEmail({ email }) {
        const account = await this.userRepository.findOne({
            filter: {
                email,
                confirmedEmail: { $exists: false },
                provider: enums_1.ProviderEnum.SYSTEM,
            },
        });
        if (!account) {
            throw new exceptions_1.NotFoundException("Fail to find account");
        }
        await this.sendEmailOtp({
            email,
            subject: enums_1.EmailEnum.ConfirmEmail,
            title: "verify Email",
        });
        return;
    }
    ;
    async verifyGoogleAccount(idToken) {
        const client = new google_auth_library_1.OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: config_1.CLIENT_IDS,
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
            throw new exceptions_1.BadRequestException("fail to verify this account with google");
        }
        return payload;
    }
    ;
    async signupWithGmail(idToken, issuer) {
        const payload = await this.verifyGoogleAccount(idToken);
        const checkUserExist = await this.userRepository.findOne({
            filter: { email: payload.email },
        });
        if (checkUserExist) {
            if (checkUserExist.provider == enums_1.ProviderEnum.GOOGLE) {
                throw new exceptions_1.ConflictException("Account already exists with diffrent provider");
            }
            const result = await this.loginWithGmail(idToken, issuer);
            return { result, status: 200 };
        }
        const user = await this.userRepository.create({
            data: {
                firstName: payload.given_name,
                lastName: payload.family_name,
                email: payload.email,
                phone: "",
                ProfileImage: payload.picture,
                provider: enums_1.ProviderEnum.GOOGLE,
                confirmEmail: new Date(),
            },
        });
        return { result: await this.tokenService.createLoginCredentials(user, issuer) };
    }
    ;
    async loginWithGmail(idToken, issuer) {
        const payload = await this.verifyGoogleAccount(idToken);
        const user = await this.userRepository.findOne({
            filter: { email: payload.email, provider: enums_1.ProviderEnum.GOOGLE },
        });
        if (!user) {
            throw new exceptions_1.NotFoundException("Invalid Credentials");
        }
        return await this.tokenService.createLoginCredentials(user, issuer);
    }
    ;
}
exports.default = new AuthService();
