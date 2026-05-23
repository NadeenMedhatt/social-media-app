import { UserModel } from './../model/user.model';
import { BaseRepository } from "./";
import { IUser } from "../../common/interfaces";

export class UserRepository extends BaseRepository<IUser> {

    constructor() {

        super(UserModel);
    }

}