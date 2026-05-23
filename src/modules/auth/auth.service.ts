import { NotificationService, notificationService, redisService, RedisService, TokenService } from './../../common/services';
import { EmailEnum, ProviderEnum } from "../../common/enums";
import { BadRequestException, ConflictException, NotFoundException } from "../../common/exceptions";
import { IUser } from "../../common/interfaces";
import { emailTemplate, sendEmail } from "../../common/utils/email";
import { compareHash, generateHash } from "../../common/utils/security";
import { UserModel } from "../../DB/model";
import { ConfirmEmailDTO, LoginDTO, SignupDTO } from "./auth.dto";
import { createNumberOtp } from '../../common/utils';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { CLIENT_IDS } from '../../config/config';
import { UserRepository } from '../../DB/repository';

class AuthService {
    private userRepository: UserRepository
    private redis: RedisService
    private readonly tokenService: TokenService
    private notification: NotificationService
    constructor() {
        this.userRepository = new UserRepository();
        this.redis = redisService;
        this.tokenService = new TokenService();
        this.notification = notificationService;
    }
    public async login({ email, password, FCM }: LoginDTO, issuer: string): Promise<any> {

        const user = await this.userRepository.findOne({
            filter: {
                email,
                provider: ProviderEnum.SYSTEM,
                confirmedEmail: { $exists: true },
            },
            options: {
                lean: false
            }
        });

        if (!user) {
            console.log('hi');

            throw new NotFoundException("Invalid Credentials");
        }
        const matchPass = await compareHash({
            plaintext: password,
            cipherText: user.password,
        });

        if (!matchPass) {
            console.log('hi1');

            throw new NotFoundException("Invalid Credentials");
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
                })
            }
        }
        return await this.tokenService.createLoginCredentials({ user, issuer });
    }
    async signup({ username, email, password, phone }: SignupDTO): Promise<IUser> {
        const checkEmailExists = await this.userRepository.findOne({
            filter: { email },
            projection: "email",
            options: { lean: true }
        });

        if (checkEmailExists) {
            throw new ConflictException("Email Exists");
        }

        const user = await this.userRepository.create({
            model: UserModel,
            data: {
                username,
                email,
                password,
                phone,
                // password: await generateHash({
                //     plaintext: password,
                // }),
                // phone: await generateEncryption(phone),
                provider: ProviderEnum.SYSTEM,
            },
        });

        await this.sendEmailOtp({
            email,
            subject: EmailEnum.ConfirmEmail,
            title: "verify Email",
        });

        return user;
    }

    private async sendEmailOtp({ email, subject, title }: { email: string, subject: EmailEnum, title: string }) {
        const isBlockedTTL = await this.redis.ttl(this.redis.blockOtpKey({ email, subject }));
        if (isBlockedTTL > 0) {
            throw new BadRequestException(`sorry we cannot request new otp while you are blocked active please try again after ${isBlockedTTL}`,);
        }

        const remainingOtpTTL = await this.redis.ttl(this.redis.otpKey({ email, subject }));
        if (remainingOtpTTL > 0) {
            throw new BadRequestException(`sorry we cannot request new otp while current otp still active please try again after ${remainingOtpTTL}`,
            );
        }
        const maxTrial = await this.redis.get(this.redis.maxAttemptOtpKey({ email, subject }));
        if (maxTrial >= 3) {
            await this.redis.set({
                key: this.redis.blockOtpKey({ email, subject }),
                value: 1,
                ttl: 7 * 60,
            });
            throw new BadRequestException(`you have reached the max trial`,
            );
        }
        const code = createNumberOtp();
        await this.redis.set({
            key: this.redis.otpKey({ email, subject }),
            value: await generateHash({ plaintext: `${code}` }),
            ttl: 120,
        });
        // emailEvent.emit("sendEmail", async () => {
        await sendEmail({
            to: email,
            subject,
            html: emailTemplate({ code, title }),
        });
        // });

        await this.redis.incr(this.redis.maxAttemptOtpKey({ email, subject }));
    };

    async confirmEmail({ email, otp }: ConfirmEmailDTO): Promise<void> {

        const account = await this.userRepository.findOne({
            filter: {
                email,
                confirmedEmail: { $exists: false },
                provider: ProviderEnum.SYSTEM,
            },
        });


        if (!account) {
            throw new NotFoundException("Fail to find account");
        }

        const hashOtp = await this.redis.get(this.redis.otpKey({ email, subject: EmailEnum.ConfirmEmail }));
        console.log({ hashOtp });

        if (!hashOtp) {
            throw new NotFoundException("Expired OTP");
        }

        if (!(await compareHash({ plaintext: otp, cipherText: hashOtp }))) {
            throw new ConflictException("Invalid OTP");
        }
        account.confirmedEmail = new Date();
        await account.save();
        await this.redis.deleteKey(
            await this.redis.allKeysByPrefix(this.redis.otpKey({ email, subject: EmailEnum.ConfirmEmail })),
        );
        return;
    };
    async resendConfirmEmail({ email }: { email: string }): Promise<void> {

        const account = await this.userRepository.findOne({
            filter: {
                email,
                confirmedEmail: { $exists: false },
                provider: ProviderEnum.SYSTEM,
            },
        });

        if (!account) {
            throw new NotFoundException("Fail to find account");
        }

        await this.sendEmailOtp({
            email,
            subject: EmailEnum.ConfirmEmail,
            title: "verify Email",
        });

        return;
    };

    private async verifyGoogleAccount(idToken: string): Promise<TokenPayload> {
        const client = new OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: CLIENT_IDS,
        });
        const payload = ticket.getPayload();

        if (!payload?.email_verified) {
            throw new BadRequestException(
                "fail to verify this account with google",
            );
        }
        return payload;
    };
    async signupWithGmail(idToken: string, issuer: string) {
        const payload = await this.verifyGoogleAccount(idToken);
        const checkUserExist = await this.userRepository.findOne({
            filter: { email: payload.email as string },
        });
        if (checkUserExist) {
            if (checkUserExist.provider == ProviderEnum.GOOGLE) {
                throw new ConflictException("Account already exists with diffrent provider"
                );
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
                provider: ProviderEnum.GOOGLE,
                confirmEmail: new Date(),
            },
        });

        return { result: await this.tokenService.createLoginCredentials(user, issuer) };
    };
    async loginWithGmail(idToken: string, issuer: string) {
        const payload = await this.verifyGoogleAccount(idToken);

        const user = await this.userRepository.findOne({
            filter: { email: payload.email as string, provider: ProviderEnum.GOOGLE },
        });
        if (!user) {
            throw new NotFoundException("Invalid Credentials");
        }

        return await this.tokenService.createLoginCredentials(user, issuer);
    };
}

export default new AuthService();