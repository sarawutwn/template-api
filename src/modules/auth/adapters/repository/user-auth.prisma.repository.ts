import { IUser, UserId } from '@domains/users.domain';
import { IUserAuthRepository } from '@modules/auth/applications/ports/user-auth.repository';
import { Builder } from 'builder-pattern';
import { inject, injectable } from 'tsyringe';
import { IRole, RoleId } from '@/domains/roles.domain';
import { PrismaClient } from '@/prisma/client';

@injectable()
export class UserAuthPrismaRepository implements IUserAuthRepository {
  constructor(@inject(PrismaClient) private readonly prisma: PrismaClient) {}

  async getUserById(id: UserId): Promise<IUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return UserAuthPrismaRepository.toDomain(user);
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return UserAuthPrismaRepository.toDomain(user);
  }

  async create(user: IUser): Promise<IUser> {
    const createdUser = await this.prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: {
          connect: {
            id: user.roleId,
          },
        },
      },
    });

    return UserAuthPrismaRepository.toDomain(createdUser);
  }

  async update(user: IUser): Promise<IUser> {
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: user.name,
        email: user.email,
        password: user.password,
        updatedAt: user.updatedAt,
        role: {
          connect: {
            id: user.roleId,
          },
        },
      },
    });

    return UserAuthPrismaRepository.toDomain(updatedUser);
  }

  async delete(id: UserId): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  static toDomain(user: any): IUser {
    const userBuilder = Builder<IUser>()
      .id(user.id as UserId)
      .name(user.name)
      .email(user.email)
      .password(user.password)
      .createdAt(user.createdAt)
      .updatedAt(user.updatedAt)
      .roleId(user.roleId as RoleId);

    if (user.role) {
      userBuilder.role(
        Builder<IRole>()
          .id(user.role.id)
          .name(user.role.name)
          .createdAt(user.role.createdAt)
          .updatedAt(user.role.updatedAt)
          .build(),
      );
    }

    return userBuilder.build();
  }
}
