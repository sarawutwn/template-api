import { IRoleRepository } from '../ports/role.repository';
import { CreateRoleUsecase, ECreateRoleUsecaseError } from './create-role.usecase';
import { IRole, RoleId } from '@/domains/roles.domain';
import { HttpError } from '@/utils/error.utils';
import { faker } from '@faker-js/faker';
import 'reflect-metadata';
import { vi } from 'vitest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockProxy, mock } from 'vitest-mock-extended';

describe('CreateRoleUsecase', () => {
  const roleRepository: MockProxy<IRoleRepository> = mock<IRoleRepository>();
  let useCase: CreateRoleUsecase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new CreateRoleUsecase(roleRepository);
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
    it('should return created role when role name is available', async () => {
      // Arrange
      const command = { name: 'ADMIN' };
      roleRepository.getRoleByName.mockResolvedValue(null);
      roleRepository.create.mockImplementation(async (role) => ({
        ...role,
        id: faker.string.uuid() as RoleId,
        createdAt: new Date(),
        updatedAt: new Date(),
        users: [],
      }));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.name).toBe(command.name);
      expect(result.id).toBeDefined();
      expect(roleRepository.getRoleByName).toHaveBeenCalledWith(command.name);
      expect(roleRepository.create).toHaveBeenCalled();
    });

    it('should throw ROLE_ALREADY_EXISTS error when role name already exists', async () => {
      // Arrange
      const command = { name: 'ADMIN' };
      const existingRole = createRole({ name: command.name });
      roleRepository.getRoleByName.mockResolvedValue(existingRole);

      // Act
      const action = useCase.execute(command);

      // Assert
      await expect(action).rejects.toThrow(HttpError);
      await expect(action).rejects.toThrowError(ECreateRoleUsecaseError.ROLE_ALREADY_EXISTS);
    });
  });

  describe('validateRoleName', () => {
    it('should not throw when role name is available', async () => {
      // Arrange
      roleRepository.getRoleByName.mockResolvedValue(null);

      // Act
      const action = useCase.validateRoleName('NEW_ROLE');

      // Assert
      await expect(action).resolves.toBeUndefined();
    });

    it('should throw error when role name already exists', async () => {
      // Arrange
      roleRepository.getRoleByName.mockResolvedValue(createRole({ name: 'EXISTING' }));

      // Act
      const action = useCase.validateRoleName('EXISTING');

      // Assert
      await expect(action).rejects.toThrow(HttpError);
    });
  });

  describe('createRole', () => {
    it('should create role with correct data', async () => {
      // Arrange
      const roleName = 'TEST_ROLE';
      const expectedRole = createRole({ name: roleName });
      roleRepository.create.mockResolvedValue(expectedRole);

      // Act
      const result = await useCase.createRole(roleName);

      // Assert
      expect(result.name).toBe(roleName);
      expect(result.id).toBeDefined();
      expect(roleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: roleName }),
      );
    });
  });
});
