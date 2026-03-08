import { IUser, UserId } from "@domains/users.domain";

export interface IUserAuthRepository {
    getUserById(id: UserId): Promise<IUser | null>;
    getUserByEmail(email: string): Promise<IUser | null>;
    create(user: IUser): Promise<IUser>;
    update(user: IUser): Promise<IUser>;
    delete(id: UserId): Promise<void>;
}

const IUserAuthRepositoryTokenSymbol: unique symbol = Symbol('IUserAuthRepository');
export const IUserAuthRepositoryToken = IUserAuthRepositoryTokenSymbol.toString();