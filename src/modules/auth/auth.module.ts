import { IUserAuthRepositoryToken } from "./applications/ports/user-auth.repository";
import { UserAuthPrismaRepository } from "./adapters/repository/user-auth.prisma.repository";
import { container } from "tsyringe";

container.register(IUserAuthRepositoryToken, {
  useClass: UserAuthPrismaRepository,
});

export default container;
