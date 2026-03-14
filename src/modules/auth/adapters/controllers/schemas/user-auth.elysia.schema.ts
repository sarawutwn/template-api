import { t } from 'elysia';

export const userAuthSchemas = {
  signInSchema: {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    }),
    response: t.Object({
      statusCode: t.Number(),
      data: t.Object({
        token: t.String(),
        refreshToken: t.String(),
      }),
    }),
  },
};
