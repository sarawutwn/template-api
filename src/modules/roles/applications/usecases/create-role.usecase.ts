import { inject, injectable } from "tsyringe";
import {
    type IRoleRepository,
    IRoleRepositoryToken,
} from "@modules/roles/applications/ports/role.repository";
import { IRole, RoleId } from "@/domains/roles.domain";
import { HttpError } from "@/utils/error.utils";
import { Builder } from "builder-pattern";

export interface ICreateRoleUsecaseCommand {
  name: string;
}

export interface ICreateRoleUsecaseResult {
  id: RoleId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ECreateRoleUsecaseError {
  ROLE_ALREADY_EXISTS = "ROLE_ALREADY_EXISTS",
}

@injectable()
export class CreateRoleUsecase {
  constructor(
    @inject(IRoleRepositoryToken)
    private readonly roleRepository: IRoleRepository,
  ) {}

  async execute(
    command: ICreateRoleUsecaseCommand,
  ): Promise<ICreateRoleUsecaseResult> {
    await this.validateRoleName(command.name);
    const role = await this.createRole(command.name);

    return {
      id: role.id,
      name: role.name,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  async validateRoleName(name: string): Promise<void> {
    const existingRole = await this.roleRepository.getRoleByName(name);
    if (existingRole) {
      throw new HttpError(409, ECreateRoleUsecaseError.ROLE_ALREADY_EXISTS);
    }
  }

  async createRole(name: string): Promise<IRole> {
    return await this.roleRepository.create(
      Builder<IRole>().name(name).build(),
    );
  }
}
