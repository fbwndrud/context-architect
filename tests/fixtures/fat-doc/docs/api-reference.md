# API Reference

Base URL: `https://api.example.com/v1`

All endpoints require authentication via Bearer token unless noted otherwise.

## Authentication

### POST /auth/login

Authenticate a user and receive access and refresh tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "expiresIn": 3600
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `429` - Too many login attempts

### POST /auth/refresh

Refresh an expired access token.

**Request Body:**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

### POST /auth/logout

Invalidate the current refresh token.

**Headers:** `Authorization: Bearer <accessToken>`

**Response (204):** No content

## Users

### GET /users/me

Get the currently authenticated user's profile.

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "Jane Smith",
    "role": "admin",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### PATCH /users/me

Update the current user's profile.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "timezone": "America/New_York"
}
```

**Response (200):** Updated user object.

### GET /users/:id

Get a user by ID. Requires admin role.

**Response (200):** User object.
**Errors:**
- `403` - Insufficient permissions
- `404` - User not found

## Projects

### GET /projects

List all projects the authenticated user has access to.

**Query Parameters:**
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 20, max: 100) - Items per page
- `status` (string) - Filter by status: `active`, `archived`
- `sort` (string) - Sort field: `name`, `createdAt`, `updatedAt`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "prj_xyz789",
      "name": "Backend Rewrite",
      "description": "Migrate legacy services to new architecture",
      "status": "active",
      "memberCount": 8,
      "taskCount": 142,
      "createdAt": "2024-03-01T09:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

### POST /projects

Create a new project.

**Request Body:**
```json
{
  "name": "New Project",
  "description": "Project description here",
  "visibility": "private"
}
```

**Response (201):** Created project object.

### GET /projects/:id

Get project details by ID.

**Response (200):** Full project object with settings.

### PATCH /projects/:id

Update project details. Requires project admin role.

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "status": "archived"
}
```

**Response (200):** Updated project object.

### DELETE /projects/:id

Delete a project and all associated data. Requires project owner role.

**Response (204):** No content.

## Tasks

### GET /projects/:projectId/tasks

List tasks in a project.

**Query Parameters:**
- `cursor` (string) - Pagination cursor
- `limit` (integer, default: 20) - Items per page
- `status` (string) - Filter: `todo`, `in_progress`, `review`, `done`
- `assignee` (string) - Filter by assignee user ID
- `priority` (string) - Filter: `low`, `medium`, `high`, `urgent`
- `label` (string) - Filter by label ID
- `search` (string) - Full-text search in title and description

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "tsk_def456",
      "title": "Implement user authentication",
      "status": "in_progress",
      "priority": "high",
      "assignee": {
        "id": "usr_abc123",
        "name": "Jane Smith"
      },
      "labels": ["backend", "security"],
      "dueDate": "2024-04-15T00:00:00Z",
      "createdAt": "2024-03-10T14:20:00Z"
    }
  ],
  "meta": {
    "cursor": "eyJpZCI6InRza19kZWY0NTYifQ==",
    "hasMore": true
  }
}
```

### POST /projects/:projectId/tasks

Create a new task in a project.

**Request Body:**
```json
{
  "title": "Add password reset flow",
  "description": "Implement forgot password with email verification",
  "priority": "medium",
  "assigneeId": "usr_abc123",
  "labels": ["lbl_001", "lbl_002"],
  "dueDate": "2024-05-01T00:00:00Z"
}
```

**Response (201):** Created task object.

### GET /tasks/:id

Get a single task by ID.

**Response (200):** Full task object with comments count and activity log.

### PATCH /tasks/:id

Update task fields.

**Request Body (all fields optional):**
```json
{
  "title": "Updated title",
  "status": "review",
  "priority": "urgent",
  "assigneeId": "usr_xyz789"
}
```

**Response (200):** Updated task object.

### DELETE /tasks/:id

Delete a task. Requires project admin or task creator.

**Response (204):** No content.

### POST /tasks/:id/comments

Add a comment to a task.

**Request Body:**
```json
{
  "body": "This looks good, moving to review."
}
```

**Response (201):** Created comment object.

### GET /tasks/:id/comments

List comments on a task.

**Response (200):** Array of comment objects with author details.

## Webhooks

### POST /webhooks

Register a new webhook endpoint.

**Request Body:**
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["task.created", "task.updated", "task.deleted"],
  "secret": "whsec_your_signing_secret"
}
```

**Response (201):** Created webhook object.

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error description",
    "code": "MACHINE_READABLE_CODE",
    "status": 400,
    "details": {}
  }
}
```

Common error codes:
- `VALIDATION_ERROR` - Request body failed validation
- `NOT_FOUND` - Requested resource does not exist
- `UNAUTHORIZED` - Missing or invalid authentication
- `FORBIDDEN` - Insufficient permissions for the operation
- `RATE_LIMITED` - Too many requests, retry after the specified delay
- `CONFLICT` - Resource conflict such as duplicate entry
- `INTERNAL_ERROR` - Unexpected server error
