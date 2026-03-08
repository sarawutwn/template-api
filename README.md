# Template API

REST API template built with Bun, Elysia, and MongoDB using Hexagonal Architecture (Ports & Adapters).

## Tech Stack

| Category | Technology |
|----------|-----------|
| Runtime | Bun |
| Framework | Elysia |
| Database | MongoDB |
| ORM | Prisma v6.19 |
| DI Container | tsyringe |
| Testing | Vitest |
| Auth | bcryptjs, jsonwebtoken |

## Project Structure

```
src/
├── index.ts                          # Entrypoint
├── configs/                          # Global configurations
├── domains/                          # Domain interfaces (pure types)
├── utils/                            # Shared utilities
├── libs/                             # Singleton instances
├── prisma/                           # Generated Prisma client
└── modules/
    ├── app.module.ts                 # Root module
    └── auth/                         # Feature module
        ├── auth.module.ts            # DI registration
        ├── adapters/
        │   ├── controllers/          # Elysia routes
        │   └── repository/           # Prisma implementations
        └── applications/
            ├── ports/                # Repository interfaces
            └── usecases/             # Business logic
```

## Architecture

Hexagonal Architecture with dependency rule: **Dependencies point inward only**

```
Controllers → Use Cases → Ports (interfaces) ← Repositories
                          ↑
                    Domain (zero dependencies)
```

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
DATABASE_URL=mongodb://localhost:27017/template-api
JWT_SECRET=your-secret-key
REFRESH_TOKEN_SECRET=your-refresh-secret
PORT=3000
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

## Adding a New Feature

Follow the checklist in [@specs/SPEC.md](specs/SPEC.md) section 15.

Key steps:
1. **Domain**: Define entity interface with branded types
2. **Prisma**: Add model and generate client
3. **Port**: Create repository interface
4. **Repository**: Implement Prisma repository
5. **Use Case**: Add business logic
6. **Test**: Write unit tests
7. **Controller**: Create Elysia routes
8. **Module**: Register DI bindings

## Key Patterns

### Use Case Structure

```typescript
@injectable()
export class ActionUsecase {
  constructor(@inject(IRepositoryToken) private repo: IRepository) {}

  async execute(command: ICommand): Promise<IResult> {
    // Business logic here
  }
}
```

### Repository Pattern

```typescript
@injectable()
export class EntityPrismaRepository implements IEntityRepository {
  constructor(@inject(PrismaClient) private prisma: PrismaClient) {}

  static toDomain(entity: any): IEntity {
    // Convert Prisma result to domain
  }
}
```

### Testing Pattern

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
| `dev` | `bun run --watch src/index.ts` | Start dev server |
| `test` | `vitest` | Run tests (watch mode) |
| `test:coverage` | `vitest run --coverage` | Run tests with coverage |

## Documentation

For detailed specifications, patterns, and conventions, refer to [@specs/SPEC.md](specs/SPEC.md).

## License

MIT
