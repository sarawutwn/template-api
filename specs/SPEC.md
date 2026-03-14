# Template API - Project Specification

## Tech Stack

| Category | Technology |
|----------|-----------|
| Runtime | Bun |
| Framework | Elysia |
| Database | MongoDB |
| ORM | Prisma (v6.19) |
| DI Container | tsyringe |
| Architecture | Hexagonal (Ports & Adapters) |
| Language | TypeScript (strict mode, ES2021) |
| Testing | Vitest + vitest-mock-extended + @faker-js/faker |
| Auth | bcryptjs (password hashing), jsonwebtoken (JWT) |
| Code Style | Prettier + @trivago/prettier-plugin-sort-imports |
| Other | builder-pattern, reflect-metadata, picocolors |

---

## 1. Project Structure

```
src/
├── index.ts                          # Entrypoint - creates Elysia app, mounts appModule, starts server
├── configs/
│   └── elysia.config.ts              # Global Elysia config (error handling, CORS, logger)
├── domains/                          # Domain interfaces (pure types, no dependencies)
│   ├── users.domain.ts
│   └── roles.domain.ts
├── utils/                            # Shared utilities
│   ├── brand.utils.ts                # Branded type helper
│   └── error.utils.ts                # HttpError class
├── libs/
│   └── prisma.ts                     # Singleton PrismaClient (for non-DI usage)
├── prisma/                           # Prisma generated client (auto-generated, DO NOT EDIT)
│   ├── client.ts
│   ├── models.ts
│   └── ...
└── modules/
    ├── app.module.ts                 # Root module - registers PrismaClient, mounts all feature controllers
    ├── auth/                         # Feature module: authentication
    │   ├── auth.module.ts            # DI registration for this module
    │   ├── adapters/
    │   │   ├── controllers/
    │   │   │   ├── schemas/
    │   │   │   │   └── user-auth.elysia.schema.ts
    │   │   │   └── user-auth.elysia.controller.ts
    │   │   └── repository/
    │   │       └── user-auth.prisma.repository.ts
    │   └── applications/
    │       ├── ports/
    │       │   └── user-auth.repository.ts
    │       └── usecases/
    │           ├── sign-in.usecase.ts
    │           └── sign-in.usecase.spec.ts
    └── roles/                        # Feature module: role management
        ├── roles.module.ts           # DI registration for this module
        ├── adapters/
        │   ├── controllers/
        │   │   └── role.elysia.controller.ts
        │   └── repository/
        │       └── role.prisma.repository.ts
        └── applications/
            ├── ports/
            │   └── role.repository.ts
            └── usecases/
                ├── create-role.usecase.ts
                ├── create-role.usecase.spec.ts
                ├── get-role-by-id.usecase.ts
                ├── get-role-by-id.usecase.spec.ts
                └── get-roles.usecase.ts

prisma/
├── schema.prisma                     # Prisma datasource + generator config
└── models/
    ├── users.prisma                  # User model
    └── roles.prisma                  # Role model
```

---

## 2. Hexagonal Architecture Overview

โปรเจคนี้ใช้ Hexagonal Architecture (Ports & Adapters) โดยแบ่งเป็น 3 layers:

```
┌─────────────────────────────────────────────────────────────────┐
│  ADAPTERS (Outer Layer)                                         │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │  Controllers          │  │  Repositories (Prisma impl)     │ │
│  │  (Elysia routes)      │  │  (implements Port interfaces)   │ │
│  └──────────┬───────────┘  └──────────────┬───────────────────┘ │
│             │                              │                     │
│             ▼                              ▲                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  APPLICATION (Middle Layer)                               │   │
│  │  ┌────────────────┐  ┌─────────────────────────────────┐  │   │
│  │  │  Use Cases       │  │  Ports (interfaces)             │  │   │
│  │  │  (business logic)│  │  (repository contracts)         │  │   │
│  │  └────────────────┘  └─────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ▲                                   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  DOMAIN (Core Layer)                                      │   │
│  │  Pure interfaces & branded types                          │   │
│  │  No external dependencies                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Dependency Rule**: Dependencies point inward only.
- Controllers -> Use Cases -> Ports (interfaces) <- Repositories
- Domain layer has zero external dependencies
- Use Cases depend on Port interfaces, not on concrete Repository implementations
- tsyringe DI container wires the concrete implementations at runtime

---

## 3. Path Aliases

กำหนดไว้ใน `tsconfig.json` → `paths`:

| Alias | Maps to |
|-------|---------|
| `@/*` | `src/*` |
| `@domains/*` | `src/domains/*` |
| `@modules/*` | `src/modules/*` |
| `@utils/*` | `src/utils/*` |
| `@libs/*` | `src/libs/*` |

---

## 4. Domain Layer (`src/domains/`)

Domain layer ประกอบด้วย pure TypeScript interfaces และ branded types เท่านั้น ห้ามมี dependency ภายนอก (ยกเว้น import Brand utility จาก `@utils`)

### 4.1 Branded Types

ใช้ `Brand` utility เพื่อสร้าง nominal types ป้องกัน string id ต่าง entity กันถูก assign สลับกัน:

```typescript
// src/utils/brand.utils.ts
export type Brand<K, T> = K & { readonly __brand: T };
```

### 4.2 การสร้าง Domain Interface

**ไฟล์:** `src/domains/{entity-name}.domain.ts`

**Naming Convention:**
- Type ID: `{Entity}Id` (e.g., `UserId`, `RoleId`)
- Interface: `I{Entity}` (e.g., `IUser`, `IRole`)

**Pattern:**

```typescript
import { Brand } from "@/utils/brand.utils";

// สร้าง branded type สำหรับ ID
export type EntityId = Brand<string, 'EntityId'>;

// สร้าง domain interface ที่ตรงกับ Prisma model
export interface IEntity {
    id: EntityId;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    // relation fields ให้ใส่เป็น type | null
    relatedEntity: IRelatedEntity | null;
}
```

**ตัวอย่างจริง (User — many-to-one relation):**

```typescript
// src/domains/users.domain.ts
import { Brand } from '@/utils/brand.utils';
import { IRole, RoleId } from './roles.domain';

export type UserId = Brand<string, 'UserId'>;

export interface IUser {
    id: UserId;
    name: string;
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    roleId: RoleId;
    role: IRole | null;
}
```

**ตัวอย่างจริง (Role — one-to-many relation):**

```typescript
// src/domains/roles.domain.ts
import { Brand } from '@/utils/brand.utils';
import { IUser } from './users.domain';

export type RoleId = Brand<string, 'RoleId'>;

export interface IRole {
    id: RoleId;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    users: IUser[];
}
```

**กฎ:**
- ทุก field ต้อง match กับ Prisma model
- ID fields ต้องใช้ Branded type
- Foreign key relation ให้เก็บทั้ง `roleId: RoleId` (scalar) และ `role: IRole | null` (object relation)
- **Many-to-one relation** (เช่น User → Role): ใช้ `IRelatedEntity | null` เพราะอาจจะไม่ได้ include relation มาตอน query
- **One-to-many relation** (เช่น Role → Users): ใช้ `IRelatedEntity[]` (non-nullable array) เพราะ empty array แทนกรณีไม่มี relation

---

## 5. Prisma Layer (`prisma/`)

### 5.1 Schema Configuration

**ไฟล์:** `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/prisma"       // generate ไปที่ src/prisma/
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}
```

### 5.2 Model Files

แยก model เป็นไฟล์ใน `prisma/models/` โดยทุก model จะถูก Prisma auto-merge เข้ากับ `schema.prisma`

**ไฟล์:** `prisma/models/{entity-plural}.prisma`

**Pattern:**

```prisma
model EntityName {
    id        String   @id @default(auto()) @map("_id") @db.ObjectId
    name      String   @map("name")
    createdAt DateTime @default(now()) @map("created_at")
    updatedAt DateTime @updatedAt @map("updated_at")
    // relation ใช้ @db.ObjectId สำหรับ foreign key
    roleId    String   @map("role_id") @db.ObjectId
    role      Role     @relation(fields: [roleId], references: [id])
}
```

**กฎ MongoDB-specific:**
- `@id @default(auto()) @map("_id") @db.ObjectId` สำหรับทุก primary key
- `@map("snake_case")` สำหรับทุก field เพื่อ map ชื่อใน MongoDB
- Foreign key ต้อง annotate `@db.ObjectId`
- ใช้ `@unique` สำหรับ fields ที่ต้อง unique (เช่น email, name)

### 5.3 Prisma Config

**ไฟล์:** `prisma.config.ts`

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

### 5.4 Generated Client

Prisma generate output ไปที่ `src/prisma/` ซึ่งถูก auto-generate ห้ามแก้ไข
Import `PrismaClient` จาก `@/prisma/client`:

```typescript
import { PrismaClient } from "@/prisma/client";
```

---

## 6. Module System (`src/modules/`)

### 6.1 Module Structure

แต่ละ feature จะอยู่ใน folder ของตัวเอง ภายใต้ `src/modules/{module-name}/`:

```
src/modules/{module-name}/
├── {module-name}.module.ts           # DI registration
├── adapters/
│   ├── controllers/
│   │   ├── schemas/
│   │   │   └── {entity}.elysia.schema.ts       # Route validation schemas
│   │   └── {entity}.elysia.controller.ts
│   └── repository/
│       └── {entity}.prisma.repository.ts
└── applications/
    ├── ports/
    │   └── {entity}.repository.ts    # Interface (Port)
    └── usecases/
        ├── {action}.usecase.ts
        └── {action}.usecase.spec.ts
```

### 6.2 Feature Module File (`{module-name}.module.ts`)

ไฟล์นี้ทำหน้าที่ register DI bindings ระหว่าง Port interface กับ Adapter implementation

**ตำแหน่ง:** `src/modules/{module-name}/{module-name}.module.ts`

**Pattern:**

```typescript
import { I{Entity}RepositoryToken } from "./applications/ports/{entity}.repository";
import { {Entity}PrismaRepository } from "./adapters/repository/{entity}.prisma.repository";
import { container } from "tsyringe";

container.register(I{Entity}RepositoryToken, {
  useClass: {Entity}PrismaRepository,
});

export default container;
```

**ตัวอย่างจริง (auth):**

```typescript
// src/modules/auth/auth.module.ts
import { container } from 'tsyringe';
import { UserAuthPrismaRepository } from './adapters/repository/user-auth.prisma.repository';
import { IUserAuthRepositoryToken } from './applications/ports/user-auth.repository';

container.register(IUserAuthRepositoryToken, {
  useClass: UserAuthPrismaRepository,
});

export default container;
```

**ตัวอย่างจริง (roles):**

```typescript
// src/modules/roles/roles.module.ts
import { container } from 'tsyringe';
import { RolePrismaRepository } from './adapters/repository/role.prisma.repository';
import { IRoleRepositoryToken } from './applications/ports/role.repository';

container.register(IRoleRepositoryToken, {
  useClass: RolePrismaRepository,
});

export default container;
```

**กฎ:**
- ใช้ `container.register(Token, { useClass: ConcreteClass })` เพื่อ bind interface กับ implementation
- Token คือ string ที่ได้จาก `Symbol.toString()` (ดูหัวข้อ Ports)
- Export `container` เป็น default export

### 6.3 App Module (`src/modules/app.module.ts`)

Root module ที่ทำ 3 สิ่ง:
1. Register `PrismaClient` instance เข้า DI container
2. Import ทุก feature module (side-effect import เพื่อ trigger DI registration)
3. สร้าง route group `/api` แล้ว mount controllers

**Pattern:**

```typescript
import app from "@/configs/elysia.config";
import { {Entity}ElysiaController } from "@modules/{module}/adapters/controllers/{entity}.elysia.controller";
import { container } from "tsyringe";
import { PrismaClient } from "@/prisma/client";

// Side-effect import: triggers DI registrations in module files
import "@modules/{module}/{module}.module";

// Register PrismaClient as singleton in DI
const prisma = new PrismaClient();
container.registerInstance(PrismaClient, prisma);

const appModule = app.group("/api", (app) => {
  // Resolve controllers from DI container
  const entityController = container.resolve({Entity}ElysiaController);

  // Mount controller routes
  app.use(entityController.getRoutes());

  return app;
});

export { appModule };
```

**ตัวอย่างจริง:**

```typescript
// src/modules/app.module.ts
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
```

**เมื่อเพิ่ม module ใหม่ ต้องทำ:**
1. เพิ่ม side-effect import: `import "@modules/{new-module}/{new-module}.module";`
2. Resolve controller จาก container: `const ctrl = container.resolve(NewController);`
3. Mount routes: `app.use(ctrl.getRoutes());`

---

## 7. Ports (Application Layer - Interfaces)

### 7.1 Repository Port

Port คือ interface ที่กำหนด contract สำหรับ data access layer ใน application layer โดย Use Case จะ depend on Port interface (ไม่ depend on concrete Prisma repository)

**ตำแหน่ง:** `src/modules/{module}/applications/ports/{entity}.repository.ts`

**Naming Convention:**
- Interface: `I{Entity}Repository`
- Token variable: `I{Entity}RepositoryToken`
- Token symbol: `I{Entity}RepositoryTokenSymbol`

**Pattern:**

```typescript
import { I{Entity}, {Entity}Id } from "@domains/{entity}.domain";

export interface I{Entity}Repository {
    get{Entity}ById(id: {Entity}Id): Promise<I{Entity} | null>;
    get{Entity}ByEmail(email: string): Promise<I{Entity} | null>;
    create(entity: I{Entity}): Promise<I{Entity}>;
    update(entity: I{Entity}): Promise<I{Entity}>;
    delete(id: {Entity}Id): Promise<void>;
}

// สร้าง unique symbol แล้วแปลงเป็น string สำหรับใช้เป็น DI token
const I{Entity}RepositoryTokenSymbol: unique symbol = Symbol('I{Entity}Repository');
export const I{Entity}RepositoryToken = I{Entity}RepositoryTokenSymbol.toString();
```

**ตัวอย่างจริง (UserAuth):**

```typescript
// src/modules/auth/applications/ports/user-auth.repository.ts
import { IUser, UserId } from '@domains/users.domain';

export interface IUserAuthRepository {
    getUserById(id: UserId): Promise<IUser | null>;
    getUserByEmail(email: string): Promise<IUser | null>;
    create(user: IUser): Promise<IUser>;
    update(user: IUser): Promise<IUser>;
    delete(id: UserId): Promise<void>;
}

const IUserAuthRepositoryTokenSymbol: unique symbol = Symbol('IUserAuthRepository');
export const IUserAuthRepositoryToken = IUserAuthRepositoryTokenSymbol.toString();
```

**ตัวอย่างจริง (Role):**

```typescript
// src/modules/roles/applications/ports/role.repository.ts
import { IRole, RoleId } from '@domains/roles.domain';

export interface IRoleRepository {
    getRoleById(id: RoleId): Promise<IRole | null>;
    getRoleByName(name: string): Promise<IRole | null>;
    getRoles(): Promise<IRole[]>;
    create(role: IRole): Promise<IRole>;
    update(role: IRole): Promise<IRole>;
    delete(id: RoleId): Promise<void>;
}

const IRoleRepositoryTokenSymbol: unique symbol = Symbol('IRoleRepository');
export const IRoleRepositoryToken = IRoleRepositoryTokenSymbol.toString();
```

**กฎ:**
- Return types ใช้ `Promise<IDomain | null>` สำหรับ query ที่อาจไม่เจอ
- Return types ใช้ `Promise<IDomain>` สำหรับ create/update ที่ guaranteed return
- Return types ใช้ `Promise<IDomain[]>` สำหรับ query ที่คืน list
- Return types ใช้ `Promise<void>` สำหรับ delete
- Method parameters ใช้ Domain types (Branded IDs, Domain interfaces)
- Token ต้องสร้างจาก `Symbol().toString()` เพราะ tsyringe ใช้ string tokens สำหรับ interface injection

---

## 8. Use Cases (Application Layer - Business Logic)

### 8.1 Use Case Structure

Use Case encapsulate business logic 1 action ต่อ 1 class โดยแต่ละ use case ต้องมี:
- Command interface (input)
- Result interface (output)
- Error enum (possible errors)
- Main `execute()` method
- Private/internal methods สำหรับแต่ละ step

**ตำแหน่ง:** `src/modules/{module}/applications/usecases/{action}.usecase.ts`

**Naming Convention:**
- Class: `{Action}Usecase` (PascalCase)
- Command: `I{Action}UsecaseCommand`
- Result: `I{Action}UsecaseResult`
- Error Enum: `E{Action}UsecaseError`
- File: `{action}.usecase.ts` (kebab-case)

**Pattern:**

```typescript
import { inject, injectable } from "tsyringe";
import {
  type I{Entity}Repository,
  I{Entity}RepositoryToken,
} from "@modules/{module}/applications/ports/{entity}.repository";
import { I{Entity} } from "@/domains/{entity}.domain";
import { HttpError } from "@/utils/error.utils";
import { Builder } from "builder-pattern";
import { faker } from "@faker-js/faker";

// 1. Command: input ของ use case
export interface I{Action}UsecaseCommand {
  field1: string;
  field2: string;
}

// 2. Result: output ของ use case
export interface I{Action}UsecaseResult {
  data: string;
}

// 3. Error enum: ทุก error ที่เป็นไปได้
export enum E{Action}UsecaseError {
  ENTITY_NOT_FOUND = "ENTITY_NOT_FOUND",
  VALIDATION_FAILED = "VALIDATION_FAILED",
}

// 4. Class: ใช้ @injectable() decorator
@injectable()
export class {Action}Usecase {
  // 5. Constructor injection: inject repository ผ่าน token
  constructor(
    @inject(I{Entity}RepositoryToken)
    private readonly entityRepository: I{Entity}Repository,
  ) {}

  // 6. Main execute method: orchestrate steps
  async execute(command: I{Action}UsecaseCommand): Promise<I{Action}UsecaseResult> {
    const entity = await this.getEntityByField(command.field1);
    await this.validateSomething(command.field2, entity.field2);
    const result = await this.doSomething(entity);

    return {
      data: result,
    };
  }

  // 7. Internal methods: แต่ละ step ของ business logic แยกเป็น method
  //    ต้องเป็น async method ที่สามารถ throw HttpError ได้
  async getEntityByField(field: string): Promise<I{Entity}> {
    const entity = await this.entityRepository.getEntityByField(field);
    if (!entity) {
      throw new HttpError(404, E{Action}UsecaseError.ENTITY_NOT_FOUND);
    }
    return entity;
  }

  async validateSomething(input: string, expected: string): Promise<void> {
    const isValid = input === expected;
    if (!isValid) {
      throw new HttpError(400, E{Action}UsecaseError.VALIDATION_FAILED);
    }
  }

  async doSomething(entity: I{Entity}): Promise<string> {
    return `processed-${entity.id}`;
  }
}
```

**ตัวอย่างจริง (SignInUsecase):**

```typescript
// src/modules/auth/applications/usecases/sign-in.usecase.ts
import {
  type IUserAuthRepository,
  IUserAuthRepositoryToken,
} from '@modules/auth/applications/ports/user-auth.repository';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { inject, injectable } from 'tsyringe';
import { IUser } from '@/domains/users.domain';
import { HttpError } from '@/utils/error.utils';

export interface ISignInUsecaseCommand {
  email: string;
  password: string;
}

export interface ISignInUsecaseResult {
  token: string;
  refreshToken: string;
}

export enum ESignInUsecaseError {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
}

@injectable()
export class SignInUsecase {
  constructor(
    @inject(IUserAuthRepositoryToken)
    private readonly userAuthRepository: IUserAuthRepository,
  ) {}

  async execute(command: ISignInUsecaseCommand): Promise<ISignInUsecaseResult> {
    const user = await this.getUserByEmail(command.email);
    await this.validatePassword(command.password, user.password);
    const token = await this.generateToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    return {
      token,
      refreshToken,
    };
  }

  async getUserByEmail(email: string): Promise<IUser> {
    const user = await this.userAuthRepository.getUserByEmail(email);
    if (!user) {
      throw new HttpError(401, ESignInUsecaseError.USER_NOT_FOUND);
    }
    return user;
  }

  async validatePassword(password: string, hashedPassword: string): Promise<void> {
    const isValid = await bcrypt.compare(password, hashedPassword);
    if (!isValid) {
      throw new HttpError(401, ESignInUsecaseError.INVALID_PASSWORD);
    }
  }

  async generateToken(user: IUser): Promise<string> {
    return jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '1h',
    });
  }

  async generateRefreshToken(user: IUser): Promise<string> {
    return jwt.sign({ userId: user.id }, process.env.REFRESH_TOKEN_SECRET!, {
      expiresIn: '7d',
    });
  }
}
```

**ตัวอย่างจริง (CreateRoleUsecase — ใช้ Builder pattern):**

```typescript
// src/modules/roles/applications/usecases/create-role.usecase.ts
import {
  type IRoleRepository,
  IRoleRepositoryToken,
} from '@modules/roles/applications/ports/role.repository';
import { Builder } from 'builder-pattern';
import { inject, injectable } from 'tsyringe';
import { IRole, RoleId } from '@/domains/roles.domain';
import { HttpError } from '@/utils/error.utils';

export interface ICreateRoleUsecaseCommand {
  name: string;
}

export interface ICreateRoleUsecaseResult {
  id: RoleId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ECreateRoleUsecaseError {
  ROLE_ALREADY_EXISTS = 'ROLE_ALREADY_EXISTS',
}

@injectable()
export class CreateRoleUsecase {
  constructor(
    @inject(IRoleRepositoryToken)
    private readonly roleRepository: IRoleRepository,
  ) {}

  async execute(command: ICreateRoleUsecaseCommand): Promise<ICreateRoleUsecaseResult> {
    await this.validateRoleName(command.name);
    const role = await this.createRole(command.name);

    return {
      id: role.id,
      name: role.name,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  async validateRoleName(name: string): Promise<void> {
    const existingRole = await this.roleRepository.getRoleByName(name);
    if (existingRole) {
      throw new HttpError(409, ECreateRoleUsecaseError.ROLE_ALREADY_EXISTS);
    }
  }

  async createRole(name: string): Promise<IRole> {
    return await this.roleRepository.create(Builder<IRole>().name(name).build());
  }
}
```

**ตัวอย่างจริง (GetRoleByIdUsecase — simple query):**

```typescript
// src/modules/roles/applications/usecases/get-role-by-id.usecase.ts
import {
  type IRoleRepository,
  IRoleRepositoryToken,
} from '@modules/roles/applications/ports/role.repository';
import { inject, injectable } from 'tsyringe';
import { IRole, RoleId } from '@/domains/roles.domain';
import { HttpError } from '@/utils/error.utils';

export interface IGetRoleByIdUsecaseCommand {
  id: RoleId;
}

export interface IGetRoleByIdUsecaseResult {
  id: RoleId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum EGetRoleByIdUsecaseError {
  ROLE_NOT_FOUND = 'ROLE_NOT_FOUND',
}

@injectable()
export class GetRoleByIdUsecase {
  constructor(
    @inject(IRoleRepositoryToken)
    private readonly roleRepository: IRoleRepository,
  ) {}

  async execute(command: IGetRoleByIdUsecaseCommand): Promise<IGetRoleByIdUsecaseResult> {
    const role = await this.getRoleById(command.id);

    return {
      id: role.id,
      name: role.name,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  async getRoleById(id: RoleId): Promise<IRole> {
    const role = await this.roleRepository.getRoleById(id);
    if (!role) {
      throw new HttpError(404, EGetRoleByIdUsecaseError.ROLE_NOT_FOUND);
    }
    return role;
  }
}
```

**ตัวอย่างจริง (GetRolesUsecase — ไม่มี Command input):**

```typescript
// src/modules/roles/applications/usecases/get-roles.usecase.ts
import {
  type IRoleRepository,
  IRoleRepositoryToken,
} from '@modules/roles/applications/ports/role.repository';
import { inject, injectable } from 'tsyringe';
import { IRole, RoleId } from '@/domains/roles.domain';

export interface IGetRolesUsecaseResult {
  roles: Array<{
    id: RoleId;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

@injectable()
export class GetRolesUsecase {
  constructor(
    @inject(IRoleRepositoryToken)
    private readonly roleRepository: IRoleRepository,
  ) {}

  async execute(): Promise<IGetRolesUsecaseResult> {
    const roles = await this.roleRepository.getRoles();

    return {
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      })),
    };
  }
}
```

**หมายเหตุ Use Case แบบต่างๆ:**
- **Use Case ที่มี Command**: เช่น `SignInUsecase`, `CreateRoleUsecase`, `GetRoleByIdUsecase` — รับ command object เป็น input
- **Use Case ที่ไม่มี Command**: เช่น `GetRolesUsecase` — ไม่ต้องมี `I{Action}UsecaseCommand`, method `execute()` ไม่รับ parameter
- **Use Case ที่ไม่มี Error**: เช่น `GetRolesUsecase` — ไม่ต้องมี `E{Action}UsecaseError` enum ถ้าไม่มี error case

**กฎ:**
- ต้องมี `@injectable()` decorator
- Constructor inject repository ผ่าน `@inject(Token)` โดย token เป็น string จาก Port
- `execute()` เป็น main entry point รับ Command คืน Result
- แยกทุก step เป็น method ย่อย (ไม่ยัดทุกอย่างใน execute)
- Throw `HttpError(statusCode, ErrorEnumValue)` เมื่อเจอ error
- ทุก method ที่เป็น step ควรเป็น `async`
- **ห้าม** depend on concrete repository หรือ Prisma types โดยตรง ให้ depend on Port interface เท่านั้น
- **การสร้าง Domain Object ใน Use Case**: เมื่อต้องสร้าง domain object ใหม่ (เช่น ใน create usecase) ให้ใช้ `Builder<T>` pattern แทนการกำหนดค่าทุก field ด้วยตนเอง:
  ```typescript
  // ❌ หลีกเลี่ยง: การกำหนดทุก field ด้วยตนเอง
  async createRole(name: string): Promise<IRole> {
      const role: IRole = {
          id: faker.string.uuid() as RoleId,
          name,
          createdAt: new Date(),
          updatedAt: new Date(),
          users: [],
      };
      return await this.roleRepository.create(role);
  }

  // ✅ แนะนำ: ใช้ Builder pattern พร้อมกำหนดเฉพาะ field ที่จำเป็น
  // Fields ที่มี default value (id, createdAt, updatedAt) ให้ repository จัดการ
  async createRole(name: string): Promise<IRole> {
      return await this.roleRepository.create(
          Builder<IRole>().name(name).build()
      );
  }
  ```
  **เหตุผล**: Builder pattern ช่วยลด boilerplate code, ทำให้โค้ดกระชับขึ้น และโฟกัสเฉพาะ business logic ที่สำคัญ (เช่น name) ส่วน technical fields (id, timestamps) ให้ repository จัดการ

---

## 9. Repository (Adapter Layer - Data Access)

### 9.1 Prisma Repository Implementation

Repository คือ concrete implementation ของ Port interface ที่ใช้ Prisma เป็น ORM

**ตำแหน่ง:** `src/modules/{module}/adapters/repository/{entity}.prisma.repository.ts`

**Naming Convention:**
- Class: `{Entity}PrismaRepository`
- File: `{entity}.prisma.repository.ts`

**Pattern:**

```typescript
import { I{Entity}, {Entity}Id } from "@domains/{entity}.domain";
import { I{Entity}Repository } from "@modules/{module}/applications/ports/{entity}.repository";
import { Builder } from "builder-pattern";
import { injectable, inject } from "tsyringe";
import { PrismaClient } from "@/prisma/client";

@injectable()
export class {Entity}PrismaRepository implements I{Entity}Repository {
  // Inject PrismaClient ผ่าน constructor (PrismaClient ถูก register เป็น instance ใน app.module)
  constructor(@inject(PrismaClient) private readonly prisma: PrismaClient) {}

  async get{Entity}ById(id: {Entity}Id): Promise<I{Entity} | null> {
    const entity = await this.prisma.{model}.findUnique({
      where: { id },
    });

    if (!entity) {
      return null;
    }

    return {Entity}PrismaRepository.toDomain(entity);
  }

  async get{Entity}ByEmail(email: string): Promise<I{Entity} | null> {
    const entity = await this.prisma.{model}.findUnique({
      where: { email },
    });

    if (!entity) {
      return null;
    }

    return {Entity}PrismaRepository.toDomain(entity);
  }

  async create(entity: I{Entity}): Promise<I{Entity}> {
    const created = await this.prisma.{model}.create({
      data: {
        id: entity.id,
        name: entity.name,
        // ... map domain fields to Prisma data
        // Relation ใช้ connect:
        relatedEntity: {
          connect: {
            id: entity.relatedEntityId,
          },
        },
      },
    });

    return {Entity}PrismaRepository.toDomain(created);
  }

  async update(entity: I{Entity}): Promise<I{Entity}> {
    const updated = await this.prisma.{model}.update({
      where: { id: entity.id },
      data: {
        name: entity.name,
        // ... fields to update
        relatedEntity: {
          connect: {
            id: entity.relatedEntityId,
          },
        },
      },
    });

    return {Entity}PrismaRepository.toDomain(updated);
  }

  async delete(id: {Entity}Id): Promise<void> {
    await this.prisma.{model}.delete({
      where: { id },
    });
  }

  // Static method สำหรับ convert Prisma result → Domain interface
  // ใช้ builder-pattern library
  static toDomain(entity: any): I{Entity} {
    const builder = Builder<I{Entity}>()
      .id(entity.id as {Entity}Id)
      .name(entity.name)
      .createdAt(entity.createdAt)
      .updatedAt(entity.updatedAt)
      .relatedEntityId(entity.relatedEntityId as Related{Entity}Id);

    // Handle optional relation
    if (entity.relatedEntity) {
      builder.relatedEntity(
        Builder<IRelatedEntity>()
          .id(entity.relatedEntity.id)
          .name(entity.relatedEntity.name)
          .createdAt(entity.relatedEntity.createdAt)
          .updatedAt(entity.relatedEntity.updatedAt)
          .build(),
      );
    }

    return builder.build();
  }
}
```

**ตัวอย่างจริง (UserAuth — มี relation):**

```typescript
// src/modules/auth/adapters/repository/user-auth.prisma.repository.ts
import { IUser, UserId } from '@domains/users.domain';
import { IUserAuthRepository } from '@modules/auth/applications/ports/user-auth.repository';
import { Builder } from 'builder-pattern';
import { inject, injectable } from 'tsyringe';
import { IRole, RoleId } from '@/domains/roles.domain';
import { PrismaClient } from '@/prisma/client';

@injectable()
export class UserAuthPrismaRepository implements IUserAuthRepository {
  constructor(@inject(PrismaClient) private readonly prisma: PrismaClient) {}

  async getUserById(id: UserId): Promise<IUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return UserAuthPrismaRepository.toDomain(user);
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return UserAuthPrismaRepository.toDomain(user);
  }

  async create(user: IUser): Promise<IUser> {
    const createdUser = await this.prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: {
          connect: {
            id: user.roleId,
          },
        },
      },
    });

    return UserAuthPrismaRepository.toDomain(createdUser);
  }

  async update(user: IUser): Promise<IUser> {
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: user.name,
        email: user.email,
        password: user.password,
        updatedAt: user.updatedAt,
        role: {
          connect: {
            id: user.roleId,
          },
        },
      },
    });

    return UserAuthPrismaRepository.toDomain(updatedUser);
  }

  async delete(id: UserId): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  static toDomain(user: any): IUser {
    const userBuilder = Builder<IUser>()
      .id(user.id as UserId)
      .name(user.name)
      .email(user.email)
      .password(user.password)
      .createdAt(user.createdAt)
      .updatedAt(user.updatedAt)
      .roleId(user.roleId as RoleId);

    if (user.role) {
      userBuilder.role(
        Builder<IRole>()
          .id(user.role.id)
          .name(user.role.name)
          .createdAt(user.role.createdAt)
          .updatedAt(user.role.updatedAt)
          .build(),
      );
    }

    return userBuilder.build();
  }
}
```

**ตัวอย่างจริง (Role — มี list query และ one-to-many relation):**

```typescript
// src/modules/roles/adapters/repository/role.prisma.repository.ts
import { IRole, RoleId } from '@domains/roles.domain';
import { IRoleRepository } from '@modules/roles/applications/ports/role.repository';
import { Builder } from 'builder-pattern';
import { inject, injectable } from 'tsyringe';
import { PrismaClient } from '@/prisma/client';

@injectable()
export class RolePrismaRepository implements IRoleRepository {
  constructor(@inject(PrismaClient) private readonly prisma: PrismaClient) {}

  async getRoleById(id: RoleId): Promise<IRole | null> {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      return null;
    }

    return RolePrismaRepository.toDomain(role);
  }

  async getRoleByName(name: string): Promise<IRole | null> {
    const role = await this.prisma.role.findUnique({
      where: { name },
    });

    if (!role) {
      return null;
    }

    return RolePrismaRepository.toDomain(role);
  }

  async getRoles(): Promise<IRole[]> {
    const roles = await this.prisma.role.findMany();
    return roles.map((role) => RolePrismaRepository.toDomain(role));
  }

  async create(role: IRole): Promise<IRole> {
    const createdRole = await this.prisma.role.create({
      data: {
        name: role.name,
      },
    });

    return RolePrismaRepository.toDomain(createdRole);
  }

  async update(role: IRole): Promise<IRole> {
    const updatedRole = await this.prisma.role.update({
      where: { id: role.id },
      data: {
        name: role.name,
        updatedAt: role.updatedAt,
      },
    });

    return RolePrismaRepository.toDomain(updatedRole);
  }

  async delete(id: RoleId): Promise<void> {
    await this.prisma.role.delete({
      where: { id },
    });
  }

  static toDomain(role: any): IRole {
    const builder = Builder<IRole>()
      .id(role.id as RoleId)
      .name(role.name)
      .createdAt(role.createdAt)
      .updatedAt(role.updatedAt);

    if (role.users) {
      builder.users(
        role.users.map((user: any) => ({
          id: user.id as import('@domains/users.domain').UserId,
          name: user.name,
          email: user.email,
          password: user.password,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          roleId: user.roleId as RoleId,
          role: null,
        })),
      );
    }

    return builder.build();
  }
}
```

**กฎ:**
- ต้องมี `@injectable()` decorator
- `implements I{Entity}Repository` (Port interface)
- Inject `PrismaClient` ผ่าน `@inject(PrismaClient)` (PrismaClient ถูก register ด้วย `registerInstance` ใน app.module)
- ใช้ `Builder<IDomain>()` จาก `builder-pattern` สำหรับ mapping Prisma result → Domain
- `toDomain()` เป็น `static` method
- Cast id fields เป็น Branded type: `user.id as UserId`
- Handle optional relations ด้วย `if (entity.relation)` check
- สำหรับ list query ใช้ `findMany()` แล้ว `.map()` ด้วย `toDomain()`
- Repository ที่ใช้ Builder pattern ใน create ให้ส่งเฉพาะ business fields (เช่น `name`) ไม่ต้องส่ง `id`, `createdAt`, `updatedAt` เพราะ Prisma จัดการให้

---

## 10. Controller (Adapter Layer - HTTP)

### 10.1 Elysia Controller

Controller ทำหน้าที่เป็น HTTP adapter ที่รับ request แล้วส่งต่อให้ Use Case

**ตำแหน่ง:** `src/modules/{module}/adapters/controllers/{entity}.elysia.controller.ts`

**Naming Convention:**
- Class: `{Entity}ElysiaController`
- File: `{entity}.elysia.controller.ts`

**Pattern:**

```typescript
import { Elysia, t } from "elysia";
import { {Action}Usecase } from "@modules/{module}/applications/usecases/{action}.usecase";
import { inject, injectable } from "tsyringe";

@injectable()
export class {Entity}ElysiaController {
  // Inject use cases ผ่าน constructor
  // Use case ที่มี @injectable() สามารถ inject ตรงด้วย class reference ได้ (ไม่ต้องใช้ token)
  constructor(
    @inject({Action}Usecase) private readonly {action}Usecase: {Action}Usecase,
  ) {}

  // Method สำหรับ register routes
  registerRoute(service: Elysia) {
    return service.group("/{module-path}", (app) => {
      // แต่ละ route call use case's execute method
      app.post(
        "/{action}",
        async ({ body }) => {
          const result = await this.{action}Usecase.execute({
            field1: body.field1,
            field2: body.field2,
          });
          return result;
        },
        {
          // Elysia schema validation (runtime type checking)
          body: t.Object({
            field1: t.String(),
            field2: t.String(),
          }),
        },
      );

      return app;
    });
  }

  // Public method ที่สร้าง Elysia instance ใหม่พร้อม routes
  // ถูกเรียกจาก app.module
  getRoutes() {
    return this.registerRoute(new Elysia({ tags: ["{module-tag}"] }));
  }
}
```

**ตัวอย่างจริง (UserAuth — single use case):**

```typescript
// src/modules/auth/adapters/controllers/user-auth.elysia.controller.ts
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
```

**ตัวอย่างจริง (Role — multiple use cases, multiple HTTP methods):**

```typescript
// src/modules/roles/adapters/controllers/role.elysia.controller.ts
import { CreateRoleUsecase } from '@modules/roles/applications/usecases/create-role.usecase';
import { GetRoleByIdUsecase } from '@modules/roles/applications/usecases/get-role-by-id.usecase';
import { GetRolesUsecase } from '@modules/roles/applications/usecases/get-roles.usecase';
import { Elysia, t } from 'elysia';
import { inject, injectable } from 'tsyringe';
import { RoleId } from '@/domains/roles.domain';

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
```

**กฎ:**
- ต้องมี `@injectable()` decorator
- Inject Use Case ด้วย `@inject(UsecaseClass)` (tsyringe auto-resolve `@injectable()` classes)
- `registerRoute()` รับ Elysia instance แล้ว return กลับ (method chaining)
- ใช้ `service.group("/{path}", (app) => { ... })` สำหรับ route grouping
- Import schemas จากไฟล์แยกใน `schemas/` directory — ห้าม inline schema ใน controller
- `getRoutes()` สร้าง `new Elysia({ tags: ["{tag}"] })` เพราะ Elysia ใช้ plugin pattern — ส่ง tag สำหรับ OpenAPI docs
- Controller ห้ามมี business logic ให้ delegate ทั้งหมดให้ Use Case
- Route handler ทำแค่: extract input จาก request → call usecase.execute() → return result
- Controller สามารถ inject หลาย use cases ได้ใน constructor เดียวกัน
- สำหรับ route params ที่เป็น Branded type ให้ cast ใน handler: `params.id as RoleId`

### 10.2 Schema Files (`schemas/{entity}.elysia.schema.ts`)

Schema files แยกการกำหนด validation schemas ออกจาก controller เพื่อความสะอาดและง่ายต่อการ maintain

**ตำแหน่ง:** `src/modules/{module}/adapters/controllers/schemas/{entity}.elysia.schema.ts`

**Naming Convention:**
- Export object: `{entity}Schemas` (e.g., `userAuthSchemas`, `productSchemas`)
- Individual schema: `{action}Schema` (e.g., `signInSchema`, `createUserSchema`)
- File: `{entity}.elysia.schema.ts`

**Pattern:**

```typescript
// src/modules/{module}/adapters/controllers/schemas/{entity}.elysia.schema.ts
import { t } from "elysia";

export const {entity}Schemas = {
  {action}Schema: {
    body: t.Object({
      field1: t.String(),
      field2: t.Number(),
    }),
    response: t.Object({
      statusCode: t.Number(),
      data: t.Object({
        result: t.String(),
      }),
    }),
  },
};
```

**ตัวอย่างจริง:**

```typescript
// src/modules/auth/adapters/controllers/schemas/user-auth.elysia.schema.ts
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
```

**Usage in Controller:**

```typescript
// src/modules/auth/adapters/controllers/user-auth.elysia.controller.ts
import { userAuthSchemas } from './schemas/user-auth.elysia.schema';

app.post(
  '/sign-in',
  async ({ body }) => {
    const result = await this.signInUsecase.execute(body);
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
```

**กฎ:**
- Route validation schemas (body, response, query, params) MUST be defined in separate schema files under `schemas/` directory
- Export schemas as an object with descriptive name: `{entity}Schemas`
- แต่ละ schema ต้องมีทั้ง `body` และ `response` properties
- Response schemas ต้อง include `statusCode` (t.Number()) และ `data` wrapper ที่ match กับ actual response structure
- Import schemas ใน controller โดยใช้ relative path: `import { entitySchemas } from './schemas/entity.elysia.schema'`
- ใช้ Elysia's `t` factory (t.Object, t.String, t.Number, etc.) สำหรับ type definitions
- สำหรับ multiple actions ใน controller เดียวกัน ให้เพิ่ม schema ใน object เดียวกัน: `{ signInSchema, signUpSchema, ... }`

---

## 11. Error Handling

### 11.1 HttpError Class

**ตำแหน่ง:** `src/utils/error.utils.ts`

```typescript
export class HttpError extends Error {
    constructor(
      public status: number,
      public message: string,
    ) {
      super(message);
      this.name = 'HttpError';
    }
}
```

### 11.2 Global Error Handler

กำหนดไว้ใน `src/configs/elysia.config.ts`:

```typescript
const app = new Elysia({}).onError(({ error, set, code }) => {
  // Elysia validation error → 400
  if (code === "VALIDATION") {
    set.status = 400;
    return {
      statusCode: 400,
      message: "Validation failed",
      error: error.validator,
    };
  }
  // HttpError (thrown from use cases) → use error's status
  if (error instanceof HttpError) {
    set.status = error.status;
    return { statusCode: error.status, message: error.message };
  }
  // Unexpected error → 500
  set.status = 500;
  return { statusCode: 500, message: "Internal Server Error", error };
});
```

**Error Response Format:**

```json
{
  "statusCode": 401,
  "message": "USER_NOT_FOUND"
}
```

**กฎ:**
- Use Case throw `HttpError` ด้วย appropriate status code และ error enum value เป็น message
- Global error handler จัดการ mapping ให้ตอบ JSON response ที่ถูก format
- ทุก error message ใช้ SCREAMING_SNAKE_CASE enum values

---

## 12. Dependency Injection (DI) Flow

### 12.1 DI Registration Sequence

```
1. src/index.ts
   └── imports appModule

2. src/modules/app.module.ts
   ├── import "@modules/auth/auth.module"      ← triggers DI registration (side-effect)
   ├── import "@modules/roles/roles.module"    ← triggers DI registration (side-effect)
   ├── new PrismaClient()
   ├── container.registerInstance(PrismaClient, prisma)   ← register Prisma as singleton
   ├── container.resolve(UserAuthElysiaController)        ← resolve controller
   └── container.resolve(RoleElysiaController)            ← resolve controller

3. src/modules/auth/auth.module.ts (triggered by side-effect import)
   └── container.register(IUserAuthRepositoryToken, { useClass: UserAuthPrismaRepository })

4. src/modules/roles/roles.module.ts (triggered by side-effect import)
   └── container.register(IRoleRepositoryToken, { useClass: RolePrismaRepository })

5. Resolution chain (auth):
   container.resolve(UserAuthElysiaController)
   ├── needs SignInUsecase (@injectable, auto-resolved)
   │   └── needs IUserAuthRepository (via IUserAuthRepositoryToken)
   │       └── resolves to UserAuthPrismaRepository
   │           └── needs PrismaClient (registered as instance)
   └── all dependencies satisfied ✓

6. Resolution chain (roles):
   container.resolve(RoleElysiaController)
   ├── needs CreateRoleUsecase (@injectable, auto-resolved)
   │   └── needs IRoleRepository (via IRoleRepositoryToken)
   │       └── resolves to RolePrismaRepository
   │           └── needs PrismaClient (registered as instance)
   ├── needs GetRolesUsecase (@injectable, auto-resolved)
   │   └── needs IRoleRepository (same as above)
   ├── needs GetRoleByIdUsecase (@injectable, auto-resolved)
   │   └── needs IRoleRepository (same as above)
   └── all dependencies satisfied ✓
```

### 12.2 DI Rules

| What to register | Method | Where |
|------------------|--------|-------|
| Port → Adapter (interface binding) | `container.register(Token, { useClass: Class })` | `{module}.module.ts` |
| Singleton instances (PrismaClient) | `container.registerInstance(Class, instance)` | `app.module.ts` |
| Concrete classes with `@injectable()` | Auto-resolved (no registration needed) | N/A |

**Use Case classes ไม่ต้อง register เพราะ:**
- มี `@injectable()` decorator
- tsyringe auto-resolve classes ที่มี `@injectable()` ได้เลย
- ต้อง register เฉพาะ interface → implementation bindings (via token)

---

## 13. Testing

### 13.1 Test Configuration

**Framework:** Vitest
**Config file:** `vitest.config.ts`

```typescript
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    globalSetup: "./vitest.global-setup.ts",
    environment: "node",
    include: ["server/**/*.spec.ts", "src/**/*.spec.ts"],
    root: "./",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      thresholds: {
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50,
      },
    },
  },
});
```

**Global Setup:** `vitest.global-setup.ts`

```typescript
export default function setup() {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret-key-for-testing-only';
}
```

### 13.2 Test File Convention

**ตำแหน่ง:** อยู่ข้างๆ source file: `{action}.usecase.spec.ts`
**Naming:** `{source-file-name}.spec.ts`

### 13.3 Test Pattern สำหรับ Use Case

**เครื่องมือที่ใช้:**
- `vitest` — test runner (describe, it, expect, vi, beforeEach, afterEach)
- `vitest-mock-extended` — mock Port interfaces (mock, MockProxy)
- `@faker-js/faker` — generate test data

**Pattern:**

```typescript
import 'reflect-metadata';
import { faker } from '@faker-js/faker';
import { mock, MockProxy } from 'vitest-mock-extended';
import { {Action}Usecase, E{Action}UsecaseError } from './{action}.usecase';
import { I{Entity}Repository } from '../ports/{entity}.repository';
import { I{Entity}, {Entity}Id } from '@/domains/{entity}.domain';
import { HttpError } from '@/utils/error.utils';
import { vi } from 'vitest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('{Action}Usecase', () => {
  // 1. สร้าง mock ของ repository (Port interface)
  const entityRepository: MockProxy<I{Entity}Repository> = mock<I{Entity}Repository>();
  let useCase: {Action}Usecase;

  // 2. beforeEach: clear mocks และสร้าง use case instance ใหม่
  beforeEach(() => {
    vi.clearAllMocks();
    // สร้าง use case โดย inject mock repository ตรงๆ (ไม่ผ่าน DI container)
    useCase = new {Action}Usecase(entityRepository);
  });

  // 3. afterEach: reset mocks
  afterEach(() => {
    vi.resetAllMocks();
  });

  // 4. Helper function สำหรับสร้าง test data
  const createEntity = (overrides?: Partial<I{Entity}>): I{Entity} => ({
    id: faker.string.uuid() as {Entity}Id,
    name: faker.person.fullName(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  // 5. Test groups: แยก describe block ตาม method
  describe('execute', () => {
    it('should return expected result when action is successful', async () => {
      // Arrange: setup mock behavior
      const input = { field: faker.lorem.word() };
      const entity = createEntity({ field: input.field });
      entityRepository.getEntityByField.mockResolvedValue(entity);

      // Act: call method
      const result = await useCase.execute(input);

      // Assert: verify result and mock calls
      expect(result.data).toBeDefined();
      expect(entityRepository.getEntityByField).toHaveBeenCalledWith(input.field);
    });

    it('should throw ENTITY_NOT_FOUND error when entity does not exist', async () => {
      // Arrange
      entityRepository.getEntityByField.mockResolvedValue(null);

      // Act
      const action = useCase.execute({ field: 'test' });

      // Assert
      await expect(action).rejects.toThrow(HttpError);
      await expect(action).rejects.toThrowError(E{Action}UsecaseError.ENTITY_NOT_FOUND);
    });
  });

  // 6. Test แต่ละ internal method แยก
  describe('{internalMethodName}', () => {
    it('should return entity when found', async () => {
      // Arrange
      const entity = createEntity();
      entityRepository.getEntityByField.mockResolvedValue(entity);

      // Act
      const result = await useCase.{internalMethodName}(entity.field);

      // Assert
      expect(result).toBe(entity);
    });

    it('should throw error when not found', async () => {
      // Arrange
      entityRepository.getEntityByField.mockResolvedValue(null);

      // Act
      const action = useCase.{internalMethodName}('test');

      // Assert
      await expect(action).rejects.toThrow(HttpError);
    });
  });

  // 7. Integration tests: test full flow
  describe('Integration Tests', () => {
    it('should complete full flow successfully', async () => {
      // Arrange: setup all mocks for full flow
      const entity = createEntity();
      entityRepository.getEntityByField.mockResolvedValue(entity);

      // Act
      const result = await useCase.execute({ field: entity.field });

      // Assert: verify final result
      expect(result.data).toBeDefined();
    });

    it('should fail when repository throws error', async () => {
      // Arrange
      const repositoryError = new Error('Database connection failed');
      entityRepository.getEntityByField.mockRejectedValue(repositoryError);

      // Act
      const action = useCase.execute({ field: 'test' });

      // Assert
      await expect(action).rejects.toThrow(repositoryError);
    });
  });
});
```

**ตัวอย่างจริง (SignInUsecase test) — test structure:**

```
describe('SignInUsecase')
├── beforeEach: clearAllMocks, new SignInUsecase(mockRepo)
├── afterEach: resetAllMocks, restore env vars
├── createUser(): helper สร้าง IUser ด้วย faker
│
├── describe('execute')
│   ├── it('should return token and refreshToken when sign-in is successful')
│   └── it('should throw USER_NOT_FOUND error when user does not exist')
│
├── describe('getUserByEmail')
│   ├── it('should return user when user is found')
│   └── it('should throw USER_NOT_FOUND error when user is not found')
│
├── describe('validatePassword')
│   ├── it('should not throw error when password is valid')
│   ├── it('should throw INVALID_PASSWORD error when password is invalid')
│   └── it('should throw INVALID_PASSWORD error when password is empty')
│
├── describe('generateToken')
│   ├── it('should return valid JWT token with userId')
│   ├── it('should return token with 1 hour expiry')
│   └── it('should throw error when JWT_SECRET is not configured')
│
├── describe('generateRefreshToken')
│   ├── it('should return valid JWT refresh token with userId')
│   ├── it('should return token with 7 days expiry')
│   └── it('should throw error when REFRESH_TOKEN_SECRET is not configured')
│
└── describe('Integration Tests')
    ├── it('should complete full sign-in flow successfully')
    └── it('should fail sign-in when repository throws error')
```

**ตัวอย่างจริง (CreateRoleUsecase test) — test structure:**

```
describe('CreateRoleUsecase')
├── beforeEach: clearAllMocks, new CreateRoleUsecase(mockRepo)
├── afterEach: resetAllMocks
├── createRole(): helper สร้าง IRole ด้วย faker
│
├── describe('execute')
│   ├── it('should return created role when role name is available')
│   └── it('should throw ROLE_ALREADY_EXISTS error when role name already exists')
│
├── describe('validateRoleName')
│   ├── it('should not throw when role name is available')
│   └── it('should throw error when role name already exists')
│
└── describe('createRole')
    └── it('should create role with correct data')
```

**ตัวอย่างจริง (GetRoleByIdUsecase test) — test structure:**

```
describe('GetRoleByIdUsecase')
├── beforeEach: clearAllMocks, new GetRoleByIdUsecase(mockRepo)
├── afterEach: resetAllMocks
├── createRole(): helper สร้าง IRole ด้วย faker
│
├── describe('execute')
│   ├── it('should return role when role is found')
│   └── it('should throw ROLE_NOT_FOUND error when role does not exist')
│
└── describe('getRoleById')
    ├── it('should return role when found')
    └── it('should throw error when role is not found')
```

**กฎ Testing:**
- `import 'reflect-metadata'` ต้องอยู่บรรทัดแรกเสมอ
- Mock repository ด้วย `mock<IRepository>()` จาก vitest-mock-extended
- สร้าง Use Case instance ตรงๆ `new Usecase(mockRepo)` (ไม่ผ่าน DI container ใน test)
- ใช้ AAA pattern: Arrange → Act → Assert
- แยก describe block ต่อ 1 method ของ use case
- Test ทั้ง happy path และ error cases
- สำหรับ async error ใช้: `await expect(action).rejects.toThrow(HttpError)`
- ตรวจ error message ด้วย: `await expect(action).rejects.toThrowError(ErrorEnum.VALUE)`
- ตรวจ mock ถูกเรียกด้วย: `expect(mockRepo.method).toHaveBeenCalledWith(expectedArg)`
- ใช้ faker สร้าง random test data ไม่ hardcode
- env vars ที่ต้องใช้ใน test ให้ set ใน `vitest.global-setup.ts`
- ถ้า test ต้อง delete env var ให้ restore กลับใน afterEach

---

## 14. Entrypoint & Server Configuration

### 14.1 Index (`src/index.ts`)

```typescript
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
```

### 14.2 Elysia Config (`src/configs/elysia.config.ts`)

- Global error handler (Validation, HttpError, 500)
- Logger middleware (@tqman/nice-logger) — mode: `live`, withTimestamp: `true`
- CORS configuration — origins: `['http://localhost:5173', 'http://localhost:4000']`, credentials: `true`

```typescript
// src/configs/elysia.config.ts
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
```

---

## 15. Code Style & Prettier

### 15.1 Prettier Configuration

**ไฟล์:** `.prettierrc`

```json
{
    "semi": true,
    "tabWidth": 2,
    "printWidth": 100,
    "singleQuote": true,
    "trailingComma": "all",
    "plugins": [
        "@trivago/prettier-plugin-sort-imports"
    ],
    "importOrderSeparation": false,
    "importOrderSortSpecifiers": true,
    "importOrderParserPlugins": [
        "typescript",
        "classProperties",
        "decorators-legacy",
        "jsx"
    ],
    "importOrder": [
        "^reflect-metadata$",
        "<THIRD_PARTY_MODULES>",
        "^@/(.*)$",
        "^[./]"
    ],
    "endOfLine": "lf"
}
```

### 15.2 Import Order Rules

ลำดับ import ถูกจัดการอัตโนมัติโดย `@trivago/prettier-plugin-sort-imports`:

1. `reflect-metadata` — ต้องอยู่บรรทัดแรกเสมอ (required by tsyringe)
2. Third-party modules — เช่น `tsyringe`, `elysia`, `bcryptjs`, `builder-pattern`
3. `@/` aliased imports — เช่น `@/domains/*`, `@/utils/*`, `@/prisma/*`
4. Relative imports — เช่น `./`, `../`

### 15.3 Code Style Rules

- **Single quotes**: ใช้ single quote ทั้งโปรเจค (`'string'` ไม่ใช่ `"string"`)
- **Semicolons**: ใส่ semicolons เสมอ
- **Trailing commas**: ใส่ trailing commas ทุกที่ (`"all"`)
- **Print width**: 100 characters
- **Tab width**: 2 spaces
- **End of line**: LF (`\n`)

---

## 16. Checklist: Adding a New Feature

เมื่อต้องเพิ่ม feature ใหม่ (เช่น "sign-up") ให้ทำตามลำดับนี้:

### Step 1: Domain (ถ้ายังไม่มี)
- [ ] สร้าง `src/domains/{entity}.domain.ts`
- [ ] กำหนด branded ID type: `export type EntityId = Brand<string, 'EntityId'>`
- [ ] กำหนด domain interface: `export interface IEntity { ... }`

### Step 2: Prisma Model (ถ้ายังไม่มี)
- [ ] สร้าง `prisma/models/{entity}.prisma`
- [ ] Run `bunx prisma generate` เพื่อ generate client
- [ ] Verify generated types ใน `src/prisma/`

### Step 3: Port (ถ้ายังไม่มี)
- [ ] สร้าง `src/modules/{module}/applications/ports/{entity}.repository.ts`
- [ ] กำหนด interface `I{Entity}Repository` พร้อม methods ที่ต้องการ
- [ ] สร้าง DI token: `Symbol('I{Entity}Repository').toString()`

### Step 4: Repository (ถ้ายังไม่มี)
- [ ] สร้าง `src/modules/{module}/adapters/repository/{entity}.prisma.repository.ts`
- [ ] `implements I{Entity}Repository`
- [ ] เพิ่ม `@injectable()` decorator
- [ ] Inject `PrismaClient`
- [ ] Implement ทุก method พร้อม `toDomain()` static method
- [ ] ใช้ `Builder<IDomain>()` สำหรับ mapping

### Step 5: Use Case
- [ ] สร้าง `src/modules/{module}/applications/usecases/{action}.usecase.ts`
- [ ] กำหนด `I{Action}UsecaseCommand` (input)
- [ ] กำหนด `I{Action}UsecaseResult` (output)
- [ ] กำหนด `E{Action}UsecaseError` enum
- [ ] เพิ่ม `@injectable()` decorator
- [ ] Inject repository ผ่าน `@inject(Token)`
- [ ] Implement `execute()` method
- [ ] แยก business logic steps เป็น method ย่อย
- [ ] Throw `HttpError` สำหรับ error cases

### Step 6: Test
- [ ] สร้าง `src/modules/{module}/applications/usecases/{action}.usecase.spec.ts`
- [ ] `import 'reflect-metadata'` บรรทัดแรก
- [ ] Mock repository ด้วย `mock<IRepository>()`
- [ ] สร้าง helper `createEntity()`
- [ ] Test `execute()` — happy path + error cases
- [ ] Test แต่ละ internal method
- [ ] Test integration flow
- [ ] Run `bun run test` เพื่อ verify

### Step 7: Schema & Controller
- [ ] สร้าง schema file ใน `schemas/{entity}.elysia.schema.ts`
- [ ] Define `body` schema ใช้ Elysia's `t` factory
- [ ] Define `response` schema พร้อม `statusCode` และ `data` wrapper
- [ ] สร้าง/อัพเดท `src/modules/{module}/adapters/controllers/{entity}.elysia.controller.ts`
- [ ] เพิ่ม `@injectable()` decorator
- [ ] Inject use case ผ่าน `@inject(UsecaseClass)`
- [ ] Import schemas: `import { entitySchemas } from './schemas/entity.elysia.schema'`
- [ ] เพิ่ม route ใน `registerRoute()` → `app.{method}("/{path}", handler, { body: schema.body, response: schema.response })`
- [ ] Route handler: extract input → call usecase.execute() → return result with `{ statusCode, data }` wrapper

### Step 8: Module Registration
- [ ] อัพเดท `src/modules/{module}/{module}.module.ts`
  - เพิ่ม `container.register(Token, { useClass: Repository })` (ถ้า Port + Repository ใหม่)
- [ ] อัพเดท `src/modules/app.module.ts` (ถ้า module ใหม่)
  - เพิ่ม `import "@modules/{module}/{module}.module";`
  - เพิ่ม `container.resolve(Controller)` + `app.use(ctrl.getRoutes())`

### Step 9: Verify
- [ ] `bun run dev` — server starts without errors
- [ ] Test API endpoint
- [ ] `bun run test` — all tests pass
- [ ] `bun run test:coverage` — coverage meets thresholds

---

## 17. Naming Conventions Summary

| Component | File Name | Class/Type Name | Example |
|-----------|-----------|-----------------|---------|
| Domain | `{entity}.domain.ts` | `I{Entity}`, `{Entity}Id` | `users.domain.ts` → `IUser`, `UserId` |
| Port | `{entity}.repository.ts` | `I{Entity}Repository`, `I{Entity}RepositoryToken` | `user-auth.repository.ts` → `IUserAuthRepository` |
| Repository | `{entity}.prisma.repository.ts` | `{Entity}PrismaRepository` | `user-auth.prisma.repository.ts` → `UserAuthPrismaRepository` |
| Use Case | `{action}.usecase.ts` | `{Action}Usecase`, `I{Action}UsecaseCommand`, `I{Action}UsecaseResult`, `E{Action}UsecaseError` | `sign-in.usecase.ts` → `SignInUsecase` |
| Controller | `{entity}.elysia.controller.ts` | `{Entity}ElysiaController` | `user-auth.elysia.controller.ts` → `UserAuthElysiaController` |
| Schema | `{entity}.elysia.schema.ts` | `{entity}Schemas`, `{action}Schema` | `user-auth.elysia.schema.ts` → `userAuthSchemas`, `signInSchema` |
| Module | `{module}.module.ts` | (no class, just DI registration) | `auth.module.ts` |
| Test | `{source}.spec.ts` | (same describe block as source) | `sign-in.usecase.spec.ts` |
| Prisma Model | `{entity-plural}.prisma` | `model {Entity}` | `users.prisma` → `model User` |

---

## 18. API Response Format

**Success Response:**
Use case result ถูก return ตรงๆ จาก controller:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Response (HttpError):**

```json
{
  "statusCode": 401,
  "message": "USER_NOT_FOUND"
}
```

**Validation Error:**

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": { ... }
}
```

---

## 19. Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MongoDB connection string | `mongodb://admin:12345@localhost:27017/template-api?retryWrites=true&w=majority` |
| `JWT_SECRET` | Secret key for access token signing | `your-secret-key` |
| `REFRESH_TOKEN_SECRET` | Secret key for refresh token signing | `your-refresh-secret` |
| `PORT` | Server port (optional, default: 3000) | `3000` |

---

## 20. Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `bun run --watch src/index.ts` | Start dev server with hot reload |
| `test` | `vitest` | Run tests in watch mode |
| `test:coverage` | `vitest run --coverage` | Run tests with coverage report |
