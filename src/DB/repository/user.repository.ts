import { UserModel } from './../model/user.model';
import { BaseRepository } from "./base.repository";
import { IUser } from "../../common/interfaces";

export class UserRepository extends BaseRepository<IUser> {

    constructor() {

        super(UserModel);
    }

}