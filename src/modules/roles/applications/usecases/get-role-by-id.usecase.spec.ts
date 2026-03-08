import 'reflect-metadata';
import { faker } from '@faker-js/faker';
import { mock, MockProxy } from 'vitest-mock-extended';
import { GetRoleByIdUsecase, EGetRoleByIdUsecaseError } from './get-role-by-id.usecase';
import { IRoleRepository } from '../ports/role.repository';
import { IRole, RoleId } from '@/domains/roles.domain';
import { HttpError } from '@/utils/error.utils';
import { vi } from 'vitest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('GetRoleByIdUsecase', () => {
    const roleRepository: MockProxy<IRoleRepository> = mock<IRoleRepository>();
    let useCase: GetRoleByIdUsecase;

    beforeEach(() => {
        vi.clearAllMocks();
        useCase = new GetRoleByIdUsecase(roleRepository);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    const createRole = (overrides?: Partial<IRole>): IRole => ({
        id: faker.string.uuid() as RoleId,
        name: faker.lorem.word(),
        createdAt: new Date(),
        updatedAt: new Date(),
        users: [],
        ...overrides,
    });

    describe('execute', () => {
        it('should return role when role is found', async () => {
            // Arrange
            const role = createRole();
            roleRepository.getRoleById.mockResolvedValue(role);

            // Act
            const result = await useCase.execute({ id: role.id });

            // Assert
            expect(result.id).toBe(role.id);
            expect(result.name).toBe(role.name);
            expect(roleRepository.getRoleById).toHaveBeenCalledWith(role.id);
        });

        it('should throw ROLE_NOT_FOUND error when role does not exist', async () => {
            // Arrange
            const roleId = faker.string.uuid() as RoleId;
            roleRepository.getRoleById.mockResolvedValue(null);

            // Act
            const action = useCase.execute({ id: roleId });

            // Assert
            await expect(action).rejects.toThrow(HttpError);
            await expect(action).rejects.toThrowError(EGetRoleByIdUsecaseError.ROLE_NOT_FOUND);
        });
    });

    describe('getRoleById', () => {
        it('should return role when found', async () => {
            // Arrange
            const role = createRole();
            roleRepository.getRoleById.mockResolvedValue(role);

            // Act
            const result = await useCase.getRoleById(role.id);

            // Assert
            expect(result).toBe(role);
        });

        it('should throw error when role is not found', async () => {
            // Arrange
            const roleId = faker.string.uuid() as RoleId;
            roleRepository.getRoleById.mockResolvedValue(null);

            // Act
            const action = useCase.getRoleById(roleId);

            // Assert
            await expect(action).rejects.toThrow(HttpError);
        });
    });
});
