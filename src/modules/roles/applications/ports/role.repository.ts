import { IRole, RoleId } from '@domains/roles.domain';

export interface IRoleRepository {
  getRoleById(id: RoleId): Promise<IRole | null>;
  getRoleByName(name: string): Promise<IRole | null>;
  getRoles(): Promise<IRole[]>;
  create(role: IRole): Promise<IRole>;
  update(role: IRole): Promise<IRole>;
  delete(id: RoleId): Promise<void>;
}

const IRoleRepositoryTokenSymbol: unique symbol = Symbol('IRoleRepository');
export const IRoleRepositoryToken = IRoleRepositoryTokenSymbol.toString();
