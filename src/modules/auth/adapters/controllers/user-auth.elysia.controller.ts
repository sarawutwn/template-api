import { SignInUsecase } from '@modules/auth/applications/usecases/sign-in.usecase';
import { Elysia, t } from 'elysia';
import { inject, injectable } from 'tsyringe';
import { userAuthSchemas } from './schemas/user-auth.elysia.schema';

@injectable()
export class UserAuthElysiaController {
  constructor(@inject(SignInUsecase) private readonly signInUsecase: SignInUsecase) {}

  registerRoute(service: Elysia) {
    return service.group('/auth', (app) => {
      app.post(
        '/sign-in',
        async ({ body }) => {
          const result = await this.signInUsecase.execute({
            email: body.email,
            password: body.password,
          });
          return {
            statusCode: 200,
            data: result,
          };
        },
        {
          body: userAuthSchemas.signInSchema.body,
          response: userAuthSchemas.signInSchema.response,
        },
      );

      return app;
    });
  }

  getRoutes() {
    return this.registerRoute(new Elysia({ tags: ['auth'] }));
  }
}
