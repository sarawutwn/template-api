# Template API (Modular + Hexagonal)

REST API template built with Bun, Elysia, and MongoDB using Hexagonal Architecture (Ports & Adapters).

## Tech Stack

| Category | Technology |
|----------|-----------|
| Runtime | Bun |
| Framework | Elysia |
| Database | MongoDB |
| ORM | Prisma v6.19 |
| DI Container | tsyringe |
| Testing | Vitest + vitest-mock-extended + @faker-js/faker |
| Auth | bcryptjs, jsonwebtoken |
| Code Style | Prettier + @trivago/prettier-plugin-sort-imports |

## Project Structure

```
src/
├── index.ts                          # Entrypoint
├── configs/                          # Global configurations (error handling, CORS, logger)
├── domains/                          # Domain interfaces (pure types, no dependencies)
├── utils/                            # Shared utilities (Brand, HttpError)
├── libs/                             # Singleton instances
├── prisma/                           # Generated Prisma client (DO NOT EDIT)
└── modules/
    ├── app.module.ts                 # Root module
    ├── auth/                         # Authentication module
    │   ├── auth.module.ts
    │   ├── adapters/
    │   │   ├── controllers/
    │   │   │   ├── schemas/          # Validation schemas
    │   │   │   └── user-auth.elysia.controller.ts
    │   │   └── repository/
    │   └── applications/
    │       ├── ports/                # Repository interfaces
    │       └── usecases/             # sign-in
    └── roles/                        # Role management module
        ├── roles.module.ts
        ├── adapters/
        │   ├── controllers/
        │   └── repository/
        └── applications/
            ├── ports/
            └── usecases/             # create-role, get-role-by-id, get-roles
```

## Architecture

Hexagonal Architecture with dependency rule: **Dependencies point inward only**

```
Controllers -> Use Cases -> Ports (interfaces) <- Repositories
                              |
                        Domain (zero dependencies)
```

## API Endpoints

| Method | Path | Description | Module |
|--------|------|-------------|--------|
| POST | `/api/auth/sign-in` | Sign in with email/password | auth |
| POST | `/api/roles/` | Create a new role | roles |
| GET | `/api/roles/` | List all roles | roles |
| GET | `/api/roles/:id` | Get role by ID | roles |

OpenAPI docs available at `/openapi` when the server is running.

## Getting Started

### Prerequisites

- Bun (latest)
- MongoDB

### Installation

```bash
bun install
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_URL=mongodb://admin:12345@localhost:27017/template-api?retryWrites=true&w=majority
JWT_SECRET=your-secret-key
REFRESH_TOKEN_SECRET=your-refresh-secret
PORT=3000
```

### Database Setup

```bash
bunx prisma generate
```

### Development

```bash
bun run dev
```

Server runs on http://localhost:3000

### Testing

```bash
# Run tests in watch mode
bun run test

# Run tests with coverage
bun run test:coverage
```

## Path Aliases

| Alias | Maps to |
|-------|---------|
| `@/*` | `src/*` |
| `@domains/*` | `src/domains/*` |
| `@modules/*` | `src/modules/*` |
| `@utils/*` | `src/utils/*` |
| `@libs/*` | `src/libs/*` |

## Code Style

Prettier is configured with automatic import sorting via `@trivago/prettier-plugin-sort-imports`.

Import order:
1. `reflect-metadata`
2. Third-party modules
3. `@/` aliased imports
4. Relative imports

Key rules: single quotes, semicolons, trailing commas, 100 char print width.

## Adding a New Feature

Follow the checklist in [specs/SPEC.md](specs/SPEC.md) section 16.

Key steps:
1. **Domain** - Define entity interface with branded types
2. **Prisma** - Add model and generate client
3. **Port** - Create repository interface with DI token
4. **Repository** - Implement Prisma repository with `toDomain()`
5. **Use Case** - Add business logic (Command, Result, Error enum)
6. **Test** - Write unit tests with mocked repository
7. **Schema & Controller** - Create validation schemas and Elysia routes
8. **Module** - Register DI bindings and mount in app module

## Key Patterns

### Use Case

```typescript
@injectable()
export class ActionUsecase {
  constructor(@inject(IRepositoryToken) private repo: IRepository) {}

  async execute(command: ICommand): Promise<IResult> {
    // Orchestrate business logic steps
  }
}
```

### Repository

```typescript
@injectable()
export class EntityPrismaRepository implements IEntityRepository {
  constructor(@inject(PrismaClient) private prisma: PrismaClient) {}

  static toDomain(entity: any): IEntity {
    return Builder<IEntity>().id(entity.id as EntityId).name(entity.name).build();
  }
}
```

### Testing

```typescript
import 'reflect-metadata';

describe('ActionUsecase', () => {
  const mockRepo: MockProxy<IRepository> = mock<IRepository>();
  let useCase: ActionUsecase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new ActionUsecase(mockRepo);
  });

  it('should work', async () => {
    // Arrange
    mockRepo.method.mockResolvedValue(expected);

    // Act
    const result = await useCase.execute(input);

    // Assert
    expect(result).toEqual(expected);
  });
});
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `bun run --watch src/index.ts` | Start dev server with hot reload |
| `test` | `vitest` | Run tests (watch mode) |
| `test:coverage` | `vitest run --coverage` | Run tests with coverage report |

## Documentation

For detailed specifications, patterns, and conventions, refer to [specs/SPEC.md](specs/SPEC.md).

## License

MIT
