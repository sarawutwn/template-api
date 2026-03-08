import { Brand } from '../utils/brand.utils';
import { IRole, RoleId } from './roles.domain';

export type UserId = Brand<string, 'UserId'>;

export interface IUser {
  id: UserId;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  roleId: RoleId;
  role: IRole | null;
}
