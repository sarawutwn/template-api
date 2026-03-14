import {
  type IUserAuthRepository,
  IUserAuthRepositoryToken,
} from '@modules/auth/applications/ports/user-auth.repository';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { inject, injectable } from 'tsyringe';
import { IUser } from '@/domains/users.domain';
import { HttpError } from '@/utils/error.utils';

export interface ISignInUsecaseCommand {
  email: string;
  password: string;
}

export interface ISignInUsecaseResult {
  token: string;
  refreshToken: string;
}

export enum ESignInUsecaseError {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
}

@injectable()
export class SignInUsecase {
  constructor(
    @inject(IUserAuthRepositoryToken)
    private readonly userAuthRepository: IUserAuthRepository,
  ) {}

  async execute(command: ISignInUsecaseCommand): Promise<ISignInUsecaseResult> {
    const user = await this.getUserByEmail(command.email);

    await this.validatePassword(command.password, user.password);

    const token = await this.generateToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    return {
      token,
      refreshToken,
    };
  }

  async getUserByEmail(email: string): Promise<IUser> {
    const user = await this.userAuthRepository.getUserByEmail(email);
    if (!user) {
      throw new HttpError(401, ESignInUsecaseError.USER_NOT_FOUND);
    }
    return user;
  }

  async validatePassword(password: string, hashedPassword: string): Promise<void> {
    const isValid = await bcrypt.compare(password, hashedPassword);
    if (!isValid) {
      throw new HttpError(401, ESignInUsecaseError.INVALID_PASSWORD);
    }
  }

  async generateToken(user: IUser): Promise<string> {
    return jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '1h',
    });
  }

  async generateRefreshToken(user: IUser): Promise<string> {
    return jwt.sign({ userId: user.id }, process.env.REFRESH_TOKEN_SECRET!, {
      expiresIn: '7d',
    });
  }
}
