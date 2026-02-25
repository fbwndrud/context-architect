# TaskFlow Pro — Project Guide

## Project Overview

TaskFlow Pro is a modern, full-stack task management application built with
TypeScript, React, and Node.js. The platform enables teams to collaborate on
projects, track progress through customizable workflows, and integrate with
third-party services such as Slack, GitHub, and Jira. The application follows
a microservices-inspired modular monolith architecture where each domain
(tasks, users, notifications, billing) is encapsulated in its own module
with clear boundaries and well-defined interfaces.

The project was started in January 2024 as an internal tool and has since
grown to serve over 200 teams across the organization. The backend API serves
approximately 50,000 requests per hour during peak usage, and the frontend
SPA is optimized for performance with lazy loading, code splitting, and
aggressive caching strategies. We use server-sent events for real-time
updates and a job queue for background processing of notifications, report
generation, and webhook delivery.

Our primary goal is to maintain a clean, well-tested codebase that new
engineers can onboard to quickly. We value consistency, readability, and
pragmatic design decisions over cleverness or premature optimization.

## Directory Structure

The complete project structure is as follows:

```
taskflow-pro/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # Main CI pipeline
│   │   ├── deploy-staging.yml        # Staging deployment
│   │   ├── deploy-production.yml     # Production deployment
│   │   └── codeql-analysis.yml       # Security scanning
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
├── src/
│   ├── client/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.tsx        # Reusable button component
│   │   │   │   ├── Input.tsx         # Form input with validation
│   │   │   │   ├── Modal.tsx         # Accessible modal dialog
│   │   │   │   ├── Toast.tsx         # Notification toasts
│   │   │   │   ├── Spinner.tsx       # Loading indicators
│   │   │   │   ├── Avatar.tsx        # User avatar with fallback
│   │   │   │   ├── Badge.tsx         # Status badges
│   │   │   │   ├── Dropdown.tsx      # Dropdown menu
│   │   │   │   ├── Tooltip.tsx       # Hover tooltips
│   │   │   │   └── Card.tsx          # Content card wrapper
│   │   │   ├── tasks/
│   │   │   │   ├── TaskList.tsx       # Main task list view
│   │   │   │   ├── TaskCard.tsx       # Individual task card
│   │   │   │   ├── TaskDetail.tsx     # Full task detail panel
│   │   │   │   ├── TaskForm.tsx       # Create/edit task form
│   │   │   │   ├── TaskFilters.tsx    # Filter bar component
│   │   │   │   ├── TaskBoard.tsx      # Kanban board view
│   │   │   │   ├── TaskTimeline.tsx   # Gantt-style timeline
│   │   │   │   └── TaskComments.tsx   # Comment thread component
│   │   │   ├── projects/
│   │   │   │   ├── ProjectList.tsx
│   │   │   │   ├── ProjectDetail.tsx
│   │   │   │   ├── ProjectSettings.tsx
│   │   │   │   └── ProjectMembers.tsx
│   │   │   ├── users/
│   │   │   │   ├── UserProfile.tsx
│   │   │   │   ├── UserSettings.tsx
│   │   │   │   └── UserAvatar.tsx
│   │   │   └── layout/
│   │   │       ├── Sidebar.tsx        # Main navigation sidebar
│   │   │       ├── Header.tsx         # Top navigation bar
│   │   │       ├── Footer.tsx         # App footer
│   │   │       └── MainLayout.tsx     # Page layout wrapper
│   │   ├── hooks/
│   │   │   ├── useTasks.ts           # Task data fetching hook
│   │   │   ├── useAuth.ts            # Authentication hook
│   │   │   ├── useWebSocket.ts       # Real-time updates hook
│   │   │   ├── useDebounce.ts        # Input debouncing
│   │   │   ├── useLocalStorage.ts    # Persistent state hook
│   │   │   └── useMediaQuery.ts      # Responsive breakpoints
│   │   ├── stores/
│   │   │   ├── taskStore.ts          # Zustand task state
│   │   │   ├── authStore.ts          # Authentication state
│   │   │   ├── uiStore.ts            # UI preferences
│   │   │   └── notificationStore.ts  # Notification state
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── TasksPage.tsx
│   │   │   ├── ProjectPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   ├── styles/
│   │   │   ├── globals.css
│   │   │   ├── variables.css
│   │   │   └── animations.css
│   │   ├── utils/
│   │   │   ├── formatters.ts         # Date, number formatting
│   │   │   ├── validators.ts         # Form validation helpers
│   │   │   └── constants.ts          # Client-side constants
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── router.tsx
│   ├── server/
│   │   ├── controllers/
│   │   │   ├── taskController.ts     # Task CRUD endpoints
│   │   │   ├── projectController.ts  # Project management
│   │   │   ├── userController.ts     # User operations
│   │   │   ├── authController.ts     # Login, signup, refresh
│   │   │   ├── webhookController.ts  # Webhook handling
│   │   │   └── healthController.ts   # Health check endpoint
│   │   ├── services/
│   │   │   ├── taskService.ts        # Task business logic
│   │   │   ├── projectService.ts     # Project business logic
│   │   │   ├── userService.ts        # User business logic
│   │   │   ├── authService.ts        # Auth and token logic
│   │   │   ├── notificationService.ts # Email & push notifications
│   │   │   ├── searchService.ts      # Full-text search
│   │   │   └── analyticsService.ts   # Usage tracking
│   │   ├── repositories/
│   │   │   ├── taskRepository.ts     # Task DB operations
│   │   │   ├── projectRepository.ts  # Project DB operations
│   │   │   ├── userRepository.ts     # User DB operations
│   │   │   └── baseRepository.ts     # Shared query helpers
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT verification
│   │   │   ├── rateLimit.ts          # API rate limiting
│   │   │   ├── validate.ts           # Request validation
│   │   │   ├── errorHandler.ts       # Global error handling
│   │   │   ├── cors.ts               # CORS configuration
│   │   │   └── logging.ts            # Request logging
│   │   ├── models/
│   │   │   ├── Task.ts
│   │   │   ├── Project.ts
│   │   │   ├── User.ts
│   │   │   ├── Comment.ts
│   │   │   └── Notification.ts
│   │   ├── jobs/
│   │   │   ├── notificationJob.ts
│   │   │   ├── reportJob.ts
│   │   │   └── cleanupJob.ts
│   │   ├── lib/
│   │   │   ├── errors.ts             # AppError class definitions
│   │   │   ├── logger.ts             # Winston logger setup
│   │   │   ├── database.ts           # Prisma client instance
│   │   │   ├── redis.ts              # Redis connection
│   │   │   ├── queue.ts              # BullMQ job queue
│   │   │   └── config.ts             # Environment config
│   │   ├── routes/
│   │   │   ├── index.ts
│   │   │   ├── taskRoutes.ts
│   │   │   ├── projectRoutes.ts
│   │   │   ├── userRoutes.ts
│   │   │   └── authRoutes.ts
│   │   └── app.ts
│   └── shared/
│       ├── types/
│       │   ├── task.ts
│       │   ├── project.ts
│       │   ├── user.ts
│       │   └── api.ts
│       ├── constants.ts
│       └── utils.ts
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── taskService.test.ts
│   │   │   ├── authService.test.ts
│   │   │   └── projectService.test.ts
│   │   ├── controllers/
│   │   │   ├── taskController.test.ts
│   │   │   └── authController.test.ts
│   │   └── utils/
│   │       └── formatters.test.ts
│   ├── integration/
│   │   ├── api/
│   │   │   ├── tasks.test.ts
│   │   │   ├── auth.test.ts
│   │   │   └── projects.test.ts
│   │   └── setup.ts
│   └── e2e/
│       ├── flows/
│       │   ├── taskCreation.spec.ts
│       │   └── authentication.spec.ts
│       └── playwright.config.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── scripts/
│   ├── build.sh
│   ├── seed.ts
│   └── migrate.ts
├── docs/
│   ├── architecture.md
│   ├── api-reference.md
│   └── onboarding.md
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
└── CLAUDE.md
```

## Style Guide

### Naming Conventions

All TypeScript files must follow these naming conventions strictly:

- **Components**: Use PascalCase for React component files and their exports.
  For example, `TaskCard.tsx` exports `TaskCard`. Never use `task-card.tsx` or
  `taskCard.tsx` for component files.

- **Hooks**: Prefix all custom hooks with `use` in camelCase format. The file
  name must match the hook name exactly: `useTasks.ts` exports `useTasks`.

- **Services**: Use camelCase with the `Service` suffix. File name matches:
  `taskService.ts` exports functions from the task service module.

- **Controllers**: Use camelCase with the `Controller` suffix.

- **Types/Interfaces**: Use PascalCase. Prefix interfaces with `I` only when
  they represent an implementable contract (e.g., `IRepository`). Regular data
  shape interfaces should not use the `I` prefix (e.g., `TaskResponse`, not
  `ITaskResponse`).

- **Constants**: Use SCREAMING_SNAKE_CASE for true constants that are known at
  compile time: `MAX_RETRY_COUNT`, `API_BASE_URL`. Use camelCase for runtime
  constants: `defaultConfig`, `initialState`.

- **Enums**: Use PascalCase for the enum name, PascalCase for members:
  `TaskStatus.InProgress`, not `TASK_STATUS.IN_PROGRESS`.

- **Database columns**: Use snake_case in the database schema, camelCase in
  TypeScript models. Prisma handles the mapping automatically.

- **URL paths**: Use kebab-case for all API routes: `/api/v1/task-comments`,
  not `/api/v1/taskComments`.

- **Event names**: Use colon-separated namespaces: `task:created`,
  `notification:sent`, `user:updated`.

### Formatting Rules

- Use 2-space indentation for all TypeScript, JSON, and YAML files.
- Maximum line length is 100 characters.
- Always use single quotes for string literals in TypeScript.
- Use template literals only when interpolation is needed.
- Always include trailing commas in multi-line arrays and objects.
- Place opening braces on the same line as the statement.
- Use explicit return types on all exported functions.
- Destructure props in function parameters for React components.
- One blank line between import groups (external, internal, relative).
- No blank lines at the start or end of function bodies.
- Maximum 3 levels of nesting in any function. Extract helpers if deeper.

### Import Ordering

Imports must follow this exact order, with blank lines between groups:

```typescript
// 1. Node built-ins
import path from 'node:path';
import fs from 'node:fs/promises';

// 2. External packages
import express from 'express';
import { z } from 'zod';

// 3. Internal aliases (@/ paths)
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

// 4. Relative imports
import { validateTask } from './validators';
import type { TaskInput } from './types';
```

Always use the `type` keyword for type-only imports:
```typescript
import type { Request, Response } from 'express';
```

## Tools

**Always use ESLint** for linting all TypeScript files. The project uses
`@typescript-eslint/recommended` as the base configuration with custom rules.
Run `npm run lint` before every commit.

**Always use Prettier** for code formatting. The configuration is defined in
`.prettierrc` and must not be overridden by individual developers. Run
`npm run format` to auto-format all files.

Use **Jest** version 29.x for unit and integration tests. Do not upgrade to
Jest 30 or switch to Vitest — our test infrastructure depends on specific
Jest 29 APIs for custom matchers and snapshot serializers.

Use **Playwright** version 1.40+ for end-to-end tests. Do not use Cypress or
any other e2e framework.

Use **Prisma** version 5.x as the ORM. All database access must go through
Prisma — never write raw SQL queries unless absolutely necessary for
performance-critical operations that cannot be expressed in Prisma's query API.

Use **Zod** for all runtime validation. Do not use Joi, Yup, class-validator,
or any other validation library.

Use **Zustand** for client-side state management. Do not use Redux, MobX,
or Jotai.

Use **pnpm** as the package manager. Do not use npm or yarn. Lock file must
be committed and kept up to date.

## Architecture

The application follows a layered architecture pattern that separates concerns
into distinct layers. Each layer has a specific responsibility and can only
communicate with adjacent layers. See [architecture](docs/architecture.md) for
the reference document.

### Request Lifecycle

When a request arrives at the server, it flows through the following layers:

1. **Router Layer**: Express routes receive the incoming HTTP request and
   delegate to the appropriate controller. Routes are defined in `src/server/routes/`
   and are responsible only for mapping HTTP methods and paths to controllers.

2. **Middleware Layer**: Before reaching the controller, requests pass through
   middleware for authentication, rate limiting, request validation, and
   logging. The order of middleware matters and is configured in `app.ts`.

3. **Controller Layer**: Controllers in `src/server/controllers/` handle the
   HTTP-specific concerns — parsing request parameters, calling the appropriate
   service methods, and formatting the HTTP response. Controllers should be
   thin and contain no business logic.

4. **Service Layer**: Services in `src/server/services/` contain all business
   logic. They orchestrate operations across multiple repositories, enforce
   business rules, and handle transactions. Services are the core of the
   application and should be thoroughly tested.

5. **Repository Layer**: Repositories in `src/server/repositories/` are the
   only layer that interacts with the database through Prisma. They provide
   a clean abstraction over database operations and handle query construction.

Here is an example of how a typical controller-service-repository chain works
for creating a new task:

```typescript
// Controller — thin HTTP layer
export const createTask = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const input = createTaskSchema.parse(req.body);

  const task = await taskService.createTask(userId, input);

  res.status(201).json({
    success: true,
    data: task,
  });
};

// Service — business logic
export const createTask = async (
  userId: string,
  input: CreateTaskInput,
): Promise<TaskResponse> => {
  const project = await projectRepository.findById(input.projectId);
  if (!project) {
    throw new AppError('Project not found', 404);
  }

  const isMember = await projectRepository.isMember(project.id, userId);
  if (!isMember) {
    throw new AppError('Not a project member', 403);
  }

  const task = await taskRepository.create({
    ...input,
    createdBy: userId,
    status: TaskStatus.Todo,
    position: await taskRepository.getNextPosition(input.projectId),
  });

  await notificationService.notifyTaskCreated(task);
  await analyticsService.trackEvent('task_created', { userId, taskId: task.id });

  return mapTaskToResponse(task);
};

// Repository — data access
export const create = async (data: CreateTaskData): Promise<Task> => {
  return prisma.task.create({
    data,
    include: {
      assignee: true,
      labels: true,
      project: { select: { id: true, name: true } },
    },
  });
};
```

### Error Handling Pattern

All application errors must use the `AppError` class from `src/server/lib/errors.ts`.
This class extends the native `Error` class and adds structured error codes,
HTTP status codes, and optional metadata:

```typescript
import { AppError } from '@/lib/errors';

// Throwing errors in services
throw new AppError('Task not found', 404, {
  code: 'TASK_NOT_FOUND',
  taskId: id,
});

// Throwing validation errors
throw new AppError('Invalid task status transition', 422, {
  code: 'INVALID_STATUS_TRANSITION',
  from: currentStatus,
  to: requestedStatus,
});
```

The global error handler middleware in `src/server/middleware/errorHandler.ts`
catches all `AppError` instances and formats them into a consistent response:

```typescript
{
  "success": false,
  "error": {
    "message": "Task not found",
    "code": "TASK_NOT_FOUND",
    "status": 404
  }
}
```

### Data Validation

Use **async/await instead of callbacks** for all asynchronous operations.
Promise chains with `.then()` and `.catch()` are also discouraged — prefer
the async/await syntax for readability and consistent error handling.

All incoming request data must be validated using Zod schemas before reaching
the service layer. Define schemas in a `schemas.ts` file co-located with the
relevant controller:

```typescript
import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  projectId: z.string().uuid(),
  assigneeId: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z.string().datetime().optional(),
  labels: z.array(z.string().uuid()).max(10).default([]),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
```

## API Conventions

### Response Format

All API responses follow a consistent envelope format:

**Success responses:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 142
  }
}
```

**Error responses:**
```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "MACHINE_READABLE_CODE",
    "status": 400,
    "details": { ... }
  }
}
```

### Pagination

All list endpoints support cursor-based pagination with the following query
parameters:

- `cursor` — opaque string pointing to the last item from the previous page
- `limit` — number of items per page (default 20, max 100)
- `sort` — field to sort by (default varies per resource)
- `order` — `asc` or `desc` (default `desc`)

Example request:
```
GET /api/v1/tasks?cursor=eyJpZCI6ImFiYzEyMyJ9&limit=20&sort=createdAt&order=desc
```

### HTTP Status Codes

Use the following status codes consistently:

- `200` — Successful read or update
- `201` — Successful creation
- `204` — Successful deletion (no response body)
- `400` — Invalid request (malformed JSON, missing fields)
- `401` — Not authenticated
- `403` — Not authorized (authenticated but insufficient permissions)
- `404` — Resource not found
- `409` — Conflict (duplicate, optimistic lock failure)
- `422` — Validation error (well-formed but semantically invalid)
- `429` — Rate limited
- `500` — Unexpected server error

### Endpoint Naming

RESTful conventions for all endpoints:

```
GET    /api/v1/tasks          # List tasks (with filters)
POST   /api/v1/tasks          # Create a task
GET    /api/v1/tasks/:id      # Get task by ID
PATCH  /api/v1/tasks/:id      # Update task fields
DELETE /api/v1/tasks/:id      # Delete a task
POST   /api/v1/tasks/:id/comments    # Add comment to task
GET    /api/v1/tasks/:id/comments    # List task comments
```

Use plural nouns for all resource names. Nest sub-resources at most one level
deep. For deeper relationships, use query parameters or separate endpoints.

## Testing

### Unit Tests

Unit tests live in `tests/unit/` and mirror the source directory structure.
Every service and controller must have corresponding tests with at least 80%
code coverage.

Write tests using the Arrange-Act-Assert pattern:

```typescript
describe('taskService.createTask', () => {
  it('should create a task and notify assignee', async () => {
    // Arrange
    const userId = 'user-123';
    const input: CreateTaskInput = {
      title: 'Write tests',
      projectId: 'proj-456',
      priority: 'high',
    };
    mockProjectRepository.findById.mockResolvedValue(mockProject);
    mockProjectRepository.isMember.mockResolvedValue(true);
    mockTaskRepository.create.mockResolvedValue(mockTask);

    // Act
    const result = await taskService.createTask(userId, input);

    // Assert
    expect(result.id).toBe(mockTask.id);
    expect(mockNotificationService.notifyTaskCreated).toHaveBeenCalledWith(mockTask);
  });

  it('should throw 404 when project not found', async () => {
    mockProjectRepository.findById.mockResolvedValue(null);

    await expect(
      taskService.createTask('user-123', { title: 'Test', projectId: 'invalid' }),
    ).rejects.toThrow(new AppError('Project not found', 404));
  });
});
```

### Integration Tests

Integration tests in `tests/integration/` test the full request-response
cycle against a real test database. Use the test setup in `tests/integration/setup.ts`
which handles database seeding and cleanup:

```typescript
import { createTestApp } from '../setup';

describe('POST /api/v1/tasks', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  it('should create a task with valid input', async () => {
    const response = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ title: 'New task', projectId: testProjectId });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('New task');
  });
});
```

### End-to-End Tests

E2E tests use Playwright and test complete user workflows through the browser.
Tests are in `tests/e2e/flows/` and should cover critical paths:

- User registration and login
- Creating and editing tasks
- Drag-and-drop on kanban board
- Project settings and member management

Run e2e tests with: `pnpm test:e2e`

## Deployment

### Environment Setup

The application requires the following environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/taskflow
DATABASE_POOL_SIZE=10

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# External Services
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
GITHUB_APP_ID=12345
GITHUB_PRIVATE_KEY_PATH=/path/to/key.pem

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/123
LOG_LEVEL=info
```

### Build and Deploy

The deployment process follows these steps:

1. **Build the application:**
   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   ```

2. **Run database migrations:**
   ```bash
   pnpm prisma migrate deploy
   ```

3. **Start the application:**
   ```bash
   NODE_ENV=production node dist/server/app.js
   ```

4. **Health check:**
   The `/health` endpoint returns `200 OK` when the application is ready.
   The load balancer should be configured to poll this endpoint every 10
   seconds with a 5-second timeout and 3 retries before marking unhealthy.

### Docker

Build and run with Docker:

```bash
docker build -t taskflow-pro:latest .
docker run -p 3000:3000 --env-file .env taskflow-pro:latest
```

Or use docker-compose for local development:

```bash
docker-compose up -d
```

This starts the application, PostgreSQL, and Redis containers with hot-reload
enabled for development.

### CI/CD Pipeline

The CI pipeline runs on every pull request:

1. **Lint** — `pnpm lint` (ESLint + type checking)
2. **Unit tests** — `pnpm test:unit` with coverage threshold
3. **Integration tests** — `pnpm test:integration` against a test database
4. **Build** — `pnpm build` to verify compilation
5. **E2E tests** — `pnpm test:e2e` against the built application

Deployment to staging happens automatically when a PR is merged to `main`.
Production deployment requires manual approval in the GitHub Actions workflow.

## Git Workflow

### Branch Naming

Use the following branch naming conventions:

- `feature/TASK-123-short-description` — New features
- `fix/TASK-456-short-description` — Bug fixes
- `refactor/short-description` — Code refactoring
- `docs/short-description` — Documentation updates
- `chore/short-description` — Maintenance tasks

### Commit Messages

Follow the Conventional Commits specification:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`, `perf`

Examples:
```
feat(tasks): add drag-and-drop reordering to kanban board
fix(auth): handle expired refresh tokens gracefully
refactor(services): extract notification logic into separate service
test(api): add integration tests for task comments endpoint
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make changes and ensure all tests pass locally
3. Push the branch and create a pull request
4. Request review from at least one team member
5. Address all review comments
6. Squash and merge when approved

All PRs must:
- Have a clear description of the change
- Include tests for new functionality
- Pass all CI checks
- Have no merge conflicts
- Be approved by at least one reviewer
