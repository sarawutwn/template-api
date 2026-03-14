import { CreateRoleUsecase } from '@modules/roles/applications/usecases/create-role.usecase';
import { GetRoleByIdUsecase } from '@modules/roles/applications/usecases/get-role-by-id.usecase';
import { GetRolesUsecase } from '@modules/roles/applications/usecases/get-roles.usecase';
import { Elysia, t } from 'elysia';
import { inject, injectable } from 'tsyringe';
import { RoleId } from '@/domains/roles.domain';
import { roleElysiaSchemas } from './schemas/role.elysia.schema';

@injectable()
export class RoleElysiaController {
  constructor(
    @inject(CreateRoleUsecase) private readonly createRoleUsecase: CreateRoleUsecase,
    @inject(GetRolesUsecase) private readonly getRolesUsecase: GetRolesUsecase,
    @inject(GetRoleByIdUsecase) private readonly getRoleByIdUsecase: GetRoleByIdUsecase,
  ) {}

  registerRoute(service: Elysia) {
    return service.group('/roles', (app) => {
      app.post(
        '/',
        async ({ body }) => {
          const result = await this.createRoleUsecase.execute({
            name: body.name,
          });
          return {
            statusCode: 200,
            data: result,
          };
        },
        {
          body: roleElysiaSchemas.createRoleSchema.body,
          response: roleElysiaSchemas.createRoleSchema.response,
        },
      );

      app.get(
        '/',
        async () => {
          const result = await this.getRolesUsecase.execute();
          return {
            statusCode: 200,
            data: result.roles,
          };
        },
        {
          response: roleElysiaSchemas.getRolesSchema.response,
        },
      );

      app.get(
        '/:id',
        async ({ params }) => {
          const result = await this.getRoleByIdUsecase.execute({
            id: params.id as RoleId,
          });
          return {
            statusCode: 200,
            data: result,
          };
        },
        {
          params: t.Object({
            id: t.String(),
          }),
          response: roleElysiaSchemas.getRoleByIdSchema.response,
        },
      );

      return app;
    });
  }

  getRoutes() {
    return this.registerRoute(new Elysia({ tags: ['roles'] }));
  }
}
