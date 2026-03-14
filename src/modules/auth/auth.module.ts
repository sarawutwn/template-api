import { container } from 'tsyringe';
import { UserAuthPrismaRepository } from './adapters/repository/user-auth.prisma.repository';
import { IUserAuthRepositoryToken } from './applications/ports/user-auth.repository';

container.register(IUserAuthRepositoryToken, {
  useClass: UserAuthPrismaRepository,
});

export default container;
