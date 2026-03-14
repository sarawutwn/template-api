import cors from '@elysiajs/cors';
import { logger } from '@tqman/nice-logger';
import Elysia from 'elysia';
import { HttpError } from '@/utils/error.utils';

const app = new Elysia({}).onError(({ error, set, code }) => {
  if (code === 'VALIDATION') {
    set.status = 400;
    return {
      statusCode: 400,
      message: 'Validation failed',
      error: error.validator,
    };
  }
  if (error instanceof HttpError) {
    set.status = error.status;
    return { statusCode: error.status, message: error.message };
  }
  set.status = 500;
  return { statusCode: 500, message: 'Internal Server Error', error };
});

app.use(
  logger({
    mode: 'live',
    withTimestamp: true,
  }),
);

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:4000'],
    credentials: true,
  }),
);

export default app;
