import 'reflect-metadata';
import openapi from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import { appModule } from './modules/app.module';

const app = new Elysia().use(openapi()).use(appModule);

const server = await app.listen({
  hostname: '0.0.0.0',
  port: Number(process.env.PORT || 3000),
  idleTimeout: -1,
});

console.log(`🦊 Elysia is running on port ${server.server?.url.port}`);
