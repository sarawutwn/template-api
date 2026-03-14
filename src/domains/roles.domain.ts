import { Brand } from '@/utils/brand.utils';
import { IUser } from './users.domain';

export type RoleId = Brand<string, 'RoleId'>;

export interface IRole {
  id: RoleId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  users: IUser[];
}
