import { RoleId } from '@/domains/roles.domain';
import { CreateRoleUsecase } from '@modules/roles/applications/usecases/create-role.usecase';
import { GetRoleByIdUsecase } from '@modules/roles/applications/usecases/get-role-by-id.usecase';
import { GetRolesUsecase } from '@modules/roles/applications/usecases/get-roles.usecase';
import { Elysia, t } from 'elysia';
import { inject, injectable } from 'tsyringe';

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
          return result;
        },
        {
          body: t.Object({
            name: t.String(),
          }),
        },
      );

      app.get('/', async () => {
        const result = await this.getRolesUsecase.execute();
        return result;
      });

      app.get(
        '/:id',
        async ({ params }) => {
          const result = await this.getRoleByIdUsecase.execute({
            id: params.id as RoleId,
          });
          return result;
        },
        {
          params: t.Object({
            id: t.String(),
          }),
        },
      );

      return app;
    });
  }

  getRoutes() {
    return this.registerRoute(new Elysia({ tags: ['roles'] }));
  }
}
