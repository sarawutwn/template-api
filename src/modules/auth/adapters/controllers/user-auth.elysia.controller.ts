import { Elysia, t } from "elysia";
import { SignInUsecase } from "@modules/auth/applications/usecases/sign-in.usecase";
import { inject, injectable } from "tsyringe";

@injectable()
export class UserAuthElysiaController {
  constructor(
    @inject(SignInUsecase) private readonly signInUsecase: SignInUsecase,
  ) {}

  registerRoute(service: Elysia) {
    return service.group("/auth", (app) => {
      app.post(
        "/sign-in",
        async ({ body }) => {
          const result = await this.signInUsecase.execute({
            email: body.email,
            password: body.password,
          });
          return result;
        },
        {
          body: t.Object({
            email: t.String(),
            password: t.String(),
          }),
        },
      );

      return app;
    });
  }

  getRoutes() {
    return this.registerRoute(new Elysia({ tags: ["auth"] }));
  }
}
