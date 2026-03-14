import { UserAuthElysiaController } from '@modules/auth/adapters/controllers/user-auth.elysia.controller';
import '@modules/auth/auth.module';
import { RoleElysiaController } from '@modules/roles/adapters/controllers/role.elysia.controller';
import '@modules/roles/roles.module';
import { container } from 'tsyringe';
import app from '@/configs/elysia.config';
import { PrismaClient } from '@/prisma/client';

const prisma = new PrismaClient();
container.registerInstance(PrismaClient, prisma);

const appModule = app.group('/api', (app) => {
  const userAuthElysiaController = container.resolve(UserAuthElysiaController);
  const roleElysiaController = container.resolve(RoleElysiaController);

  app.use(userAuthElysiaController.getRoutes());
  app.use(roleElysiaController.getRoutes());

  return app;
});

export { appModule };
