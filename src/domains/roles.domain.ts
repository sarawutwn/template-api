import { IUser } from './users.domain';
import { Brand } from '@/utils/brand.utils';

export type RoleId = Brand<string, 'RoleId'>;

export interface IRole {
  id: RoleId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  users: IUser[];
}
