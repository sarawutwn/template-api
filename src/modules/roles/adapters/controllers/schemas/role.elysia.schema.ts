import { t } from 'elysia';

export const roleElysiaSchemas = {
  createRoleSchema: {
    body: t.Object({
      name: t.String(),
    }),
    response: t.Object({
      statusCode: t.Number(),
      data: t.Object({
        id: t.String(),
        name: t.String(),
        createdAt: t.String({ format: 'date-time' }),
        updatedAt: t.String({ format: 'date-time' }),
      }),
    }),
  },
  getRolesSchema: {
    response: t.Object({
      statusCode: t.Number(),
      data: t.Array(
        t.Object({
          id: t.String(),
          name: t.String(),
          createdAt: t.String({ format: 'date-time' }),
          updatedAt: t.String({ format: 'date-time' }),
        }),
      ),
    }),
  },
  getRoleByIdSchema: {
    response: t.Object({
      statusCode: t.Number(),
      data: t.Object({
        id: t.String(),
        name: t.String(),
        createdAt: t.String({ format: 'date-time' }),
        updatedAt: t.String({ format: 'date-time' }),
      }),
    }),
  },
};
