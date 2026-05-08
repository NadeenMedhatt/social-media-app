import type { NextFunction, Request, Response } from "express";
import { RoleEnum, TokenTypeEnum } from "../common/enums";
import { TokenService } from "../common/services";
import { BadRequestException, UnAuthorizedException } from "../common/exceptions";


export const authentication = (tokenType = TokenTypeEnum.ACCESS) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tokenService: TokenService = new TokenService();

    const [schema, credentials] = req?.headers.authorization?.split(" ") || [];

    if (!schema || !credentials) {
      throw new UnAuthorizedException(`missing authentication key or invalid approach`)
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
        throw new BadRequestException(`missing authentication schema`)
        break;
    }
    next();
  };
}

export const authorization = (accessRoles: RoleEnum[]) => {

  return async (req: Request, res: Response, next: NextFunction) => {

    if (!accessRoles.includes(req.user.role)) {
      throw new UnAuthorizedException(`Not authorized account`)
    }
    next();

  };

}


