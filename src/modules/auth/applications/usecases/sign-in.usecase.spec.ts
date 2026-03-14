import 'reflect-metadata';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { vi } from 'vitest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockProxy, mock } from 'vitest-mock-extended';
import { RoleId } from '@/domains/roles.domain';
import { IUser, UserId } from '@/domains/users.domain';
import { HttpError } from '@/utils/error.utils';
import { IUserAuthRepository } from '../ports/user-auth.repository';
import { ESignInUsecaseError, SignInUsecase } from './sign-in.usecase';

describe('SignInUsecase', () => {
  const userAuthRepository: MockProxy<IUserAuthRepository> = mock<IUserAuthRepository>();
  let useCase: SignInUsecase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new SignInUsecase(userAuthRepository);
  });

  afterEach(() => {
    vi.resetAllMocks();
    // Ensure env vars are restored
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
    }
    if (!process.env.REFRESH_TOKEN_SECRET) {
      process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret-key-for-testing-only';
    }
  });

  const createUser = (overrides?: Partial<IUser>): IUser => ({
    id: faker.string.uuid() as UserId,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: faker.internet.password(),
    createdAt: new Date(),
    updatedAt: new Date(),
    roleId: faker.string.uuid() as RoleId,
    role: null,
    ...overrides,
  });

  describe('execute', () => {
    it('should return token and refreshToken when sign-in is successful', async () => {
      // Arrange
      const email = faker.internet.email();
      const password = faker.internet.password();
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = createUser({ email, password: hashedPassword });

      userAuthRepository.getUserByEmail.mockResolvedValue(user);

      // Act
      const result = await useCase.execute({ email, password });

      // Assert
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      const decodedToken = jwt.verify(result.token, process.env.JWT_SECRET!) as { userId: string };
      const decodedRefreshToken = jwt.verify(
        result.refreshToken,
        process.env.REFRESH_TOKEN_SECRET!,
      ) as { userId: string };

      expect(decodedToken.userId).toBe(user.id);
      expect(decodedRefreshToken.userId).toBe(user.id);
      expect(userAuthRepository.getUserByEmail).toHaveBeenCalledWith(email);
    });

    it('should throw USER_NOT_FOUND error when user does not exist', async () => {
      // Arrange
      const email = faker.internet.email();
      const password = faker.internet.password();

      userAuthRepository.getUserByEmail.mockResolvedValue(null);

      // Act
      const action = useCase.execute({ email, password });

      // Assert
      await expect(action).rejects.toThrow(HttpError);
      await expect(action).rejects.toThrowError(ESignInUsecaseError.USER_NOT_FOUND);
      expect(userAuthRepository.getUserByEmail).toHaveBeenCalledWith(email);
    });
  });

  describe('getUserByEmail', () => {
    const email = faker.internet.email();

    it('should return user when user is found', async () => {
      // Arrange
      const user = createUser({ email });

      userAuthRepository.getUserByEmail.mockResolvedValue(user);

      // Act
      const result = await useCase.getUserByEmail(email);

      // Assert
      expect(result).toBe(user);
      expect(userAuthRepository.getUserByEmail).toHaveBeenCalledWith(email);
    });

    it('should throw USER_NOT_FOUND error when user is not found', async () => {
      // Arrange
      userAuthRepository.getUserByEmail.mockResolvedValue(null);

      const expectedError = new HttpError(401, ESignInUsecaseError.USER_NOT_FOUND);

      // Act
      const action = useCase.getUserByEmail(email);

      // Assert
      await expect(action).rejects.toThrow(HttpError);
      await expect(action).rejects.toThrowError(ESignInUsecaseError.USER_NOT_FOUND);
      expect(userAuthRepository.getUserByEmail).toHaveBeenCalledWith(email);
    });
  });

  describe('validatePassword', () => {
    const password = faker.internet.password();

    it('should not throw error when password is valid', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash(password, 10);

      // Act
      const action = useCase.validatePassword(password, hashedPassword);

      // Assert
      await expect(action).resolves.not.toThrow();
    });

    it('should throw INVALID_PASSWORD error when password is invalid', async () => {
      // Arrange
      const wrongPassword = 'wrongPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);

      const expectedError = new HttpError(401, ESignInUsecaseError.INVALID_PASSWORD);

      // Act
      const action = useCase.validatePassword(wrongPassword, hashedPassword);

      // Assert
      await expect(action).rejects.toThrow(HttpError);
      await expect(action).rejects.toThrowError(ESignInUsecaseError.INVALID_PASSWORD);
    });

    it('should throw INVALID_PASSWORD error when password is empty', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash(password, 10);

      const expectedError = new HttpError(401, ESignInUsecaseError.INVALID_PASSWORD);

      // Act
      const action = useCase.validatePassword('', hashedPassword);

      // Assert
      await expect(action).rejects.toThrow(HttpError);
      await expect(action).rejects.toThrowError(ESignInUsecaseError.INVALID_PASSWORD);
    });
  });

  describe('generateToken', () => {
    it('should return valid JWT token with userId', async () => {
      // Arrange
      const user = createUser();

      // Act
      const token = await useCase.generateToken(user);

      // Assert
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      expect(decoded.userId).toBe(user.id);
    });

    it('should return token with 1 hour expiry', async () => {
      // Arrange
      const user = createUser();

      // Act
      const token = await useCase.generateToken(user);

      // Assert
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      expect(decoded.exp).toBeDefined();

      const expiryTime = new Date(decoded.exp! * 1000);
      const now = new Date();
      const diffInHours = (expiryTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      expect(diffInHours).toBeCloseTo(1, 0);
    });

    it('should throw error when JWT_SECRET is not configured', async () => {
      // Arrange
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const user = createUser();

      // Act & Assert
      await expect(useCase.generateToken(user)).rejects.toThrow(
        'secretOrPrivateKey must have a value',
      );

      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('generateRefreshToken', () => {
    it('should return valid JWT refresh token with userId', async () => {
      // Arrange
      const user = createUser();

      // Act
      const refreshToken = await useCase.generateRefreshToken(user);

      // Assert
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');

      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as {
        userId: string;
      };
      expect(decoded.userId).toBe(user.id);
    });

    it('should return token with 7 days expiry', async () => {
      // Arrange
      const user = createUser();

      // Act
      const refreshToken = await useCase.generateRefreshToken(user);

      // Assert
      const decoded = jwt.decode(refreshToken) as jwt.JwtPayload;
      expect(decoded.exp).toBeDefined();

      const expiryTime = new Date(decoded.exp! * 1000);
      const now = new Date();
      const diffInDays = (expiryTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      expect(diffInDays).toBeCloseTo(7, 0);
    });

    it('should throw error when REFRESH_TOKEN_SECRET is not configured', async () => {
      // Arrange
      const originalSecret = process.env.REFRESH_TOKEN_SECRET;
      delete process.env.REFRESH_TOKEN_SECRET;

      const user = createUser();

      // Act & Assert
      await expect(useCase.generateRefreshToken(user)).rejects.toThrow(
        'secretOrPrivateKey must have a value',
      );

      process.env.REFRESH_TOKEN_SECRET = originalSecret;
    });
  });

  describe('Integration Tests', () => {
    it('should complete full sign-in flow successfully', async () => {
      // Arrange
      const email = faker.internet.email();
      const password = faker.internet.password();
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = createUser({ email, password: hashedPassword });

      userAuthRepository.getUserByEmail.mockResolvedValue(user);

      // Act
      const result = await useCase.execute({ email, password });

      // Assert
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.token).not.toBe(result.refreshToken);

      const tokenPayload = jwt.verify(result.token, process.env.JWT_SECRET!) as { userId: string };
      const refreshTokenPayload = jwt.verify(
        result.refreshToken,
        process.env.REFRESH_TOKEN_SECRET!,
      ) as { userId: string };

      expect(tokenPayload.userId).toBe(user.id);
      expect(refreshTokenPayload.userId).toBe(user.id);
    });

    it('should fail sign-in when repository throws error', async () => {
      // Arrange
      const email = faker.internet.email();
      const password = faker.internet.password();
      const repositoryError = new Error('Database connection failed');

      userAuthRepository.getUserByEmail.mockRejectedValue(repositoryError);

      // Act
      const action = useCase.execute({ email, password });

      // Assert
      await expect(action).rejects.toThrow(repositoryError);
    });
  });
});
