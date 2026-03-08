import { inject, injectable } from "tsyringe";
import {
    type IRoleRepository,
    IRoleRepositoryToken,
} from "@modules/roles/applications/ports/role.repository";
import { IRole, RoleId } from "@/domains/roles.domain";
import { HttpError } from "@/utils/error.utils";

export interface IGetRoleByIdUsecaseCommand {
    id: RoleId;
}

export interface IGetRoleByIdUsecaseResult {
    id: RoleId;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

export enum EGetRoleByIdUsecaseError {
    ROLE_NOT_FOUND = "ROLE_NOT_FOUND",
}

@injectable()
export class GetRoleByIdUsecase {
    constructor(
        @inject(IRoleRepositoryToken)
        private readonly roleRepository: IRoleRepository,
    ) {}

    async execute(command: IGetRoleByIdUsecaseCommand): Promise<IGetRoleByIdUsecaseResult> {
        const role = await this.getRoleById(command.id);

        return {
            id: role.id,
            name: role.name,
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
        };
    }

    async getRoleById(id: RoleId): Promise<IRole> {
        const role = await this.roleRepository.getRoleById(id);
        if (!role) {
            throw new HttpError(404, EGetRoleByIdUsecaseError.ROLE_NOT_FOUND);
        }
        return role;
    }
}
