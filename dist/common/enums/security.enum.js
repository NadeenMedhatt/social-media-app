"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogoutEnum = exports.TokenTypeEnum = exports.AudienceEnum = void 0;
var AudienceEnum;
(function (AudienceEnum) {
    AudienceEnum[AudienceEnum["USER"] = 0] = "USER";
    AudienceEnum[AudienceEnum["SYSTEM"] = 1] = "SYSTEM";
})(AudienceEnum || (exports.AudienceEnum = AudienceEnum = {}));
;
var TokenTypeEnum;
(function (TokenTypeEnum) {
    TokenTypeEnum[TokenTypeEnum["ACCESS"] = 0] = "ACCESS";
    TokenTypeEnum[TokenTypeEnum["REFRESH"] = 1] = "REFRESH";
})(TokenTypeEnum || (exports.TokenTypeEnum = TokenTypeEnum = {}));
;
var LogoutEnum;
(function (LogoutEnum) {
    LogoutEnum[LogoutEnum["ALL"] = 0] = "ALL";
    LogoutEnum[LogoutEnum["ONLY"] = 1] = "ONLY";
})(LogoutEnum || (exports.LogoutEnum = LogoutEnum = {}));
;
