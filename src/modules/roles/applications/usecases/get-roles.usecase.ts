import {
  type IRoleRepository,
  IRoleRepositoryToken,
} from '@modules/roles/applications/ports/role.repository';
import { inject, injectable } from 'tsyringe';
import { IRole, RoleId } from '@/domains/roles.domain';

export interface IGetRolesUsecaseResult {
  roles: Array<{
    id: RoleId;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

@injectable()
export class GetRolesUsecase {
  constructor(
    @inject(IRoleRepositoryToken)
    private readonly roleRepository: IRoleRepository,
  ) {}

  async execute(): Promise<IGetRolesUsecaseResult> {
    const roles = await this.roleRepository.getRoles();

    return {
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      })),
    };
  }
}
