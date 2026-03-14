import { container } from 'tsyringe';
import { RolePrismaRepository } from './adapters/repository/role.prisma.repository';
import { IRoleRepositoryToken } from './applications/ports/role.repository';

container.register(IRoleRepositoryToken, {
  useClass: RolePrismaRepository,
});

export default container;
