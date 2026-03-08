import { RolePrismaRepository } from './adapters/repository/role.prisma.repository';
import { IRoleRepositoryToken } from './applications/ports/role.repository';
import { container } from 'tsyringe';

container.register(IRoleRepositoryToken, {
  useClass: RolePrismaRepository,
});

export default container;
