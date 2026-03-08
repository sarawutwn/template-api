import { IRole, RoleId } from "@domains/roles.domain";
import { IRoleRepository } from "@modules/roles/applications/ports/role.repository";
import { Builder } from "builder-pattern";
import { injectable, inject } from "tsyringe";
import { PrismaClient } from "@/prisma/client";

@injectable()
export class RolePrismaRepository implements IRoleRepository {
    constructor(@inject(PrismaClient) private readonly prisma: PrismaClient) {}

    async getRoleById(id: RoleId): Promise<IRole | null> {
        const role = await this.prisma.role.findUnique({
            where: { id },
        });

        if (!role) {
            return null;
        }

        return RolePrismaRepository.toDomain(role);
    }

    async getRoleByName(name: string): Promise<IRole | null> {
        const role = await this.prisma.role.findUnique({
            where: { name },
        });

        if (!role) {
            return null;
        }

        return RolePrismaRepository.toDomain(role);
    }

    async getRoles(): Promise<IRole[]> {
        const roles = await this.prisma.role.findMany();
        return roles.map((role) => RolePrismaRepository.toDomain(role));
    }

    async create(role: IRole): Promise<IRole> {
        const createdRole = await this.prisma.role.create({
            data: {
                name: role.name,
            },
        });

        return RolePrismaRepository.toDomain(createdRole);
    }

    async update(role: IRole): Promise<IRole> {
        const updatedRole = await this.prisma.role.update({
            where: { id: role.id },
            data: {
                name: role.name,
                updatedAt: role.updatedAt,
            },
        });

        return RolePrismaRepository.toDomain(updatedRole);
    }

    async delete(id: RoleId): Promise<void> {
        await this.prisma.role.delete({
            where: { id },
        });
    }

    static toDomain(role: any): IRole {
        const builder = Builder<IRole>()
            .id(role.id as RoleId)
            .name(role.name)
            .createdAt(role.createdAt)
            .updatedAt(role.updatedAt);

        if (role.users) {
            builder.users(
                role.users.map((user: any) => ({
                    id: user.id as import("@domains/users.domain").UserId,
                    name: user.name,
                    email: user.email,
                    password: user.password,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    roleId: user.roleId as RoleId,
                    role: null,
                })),
            );
        }

        return builder.build();
    }
}
