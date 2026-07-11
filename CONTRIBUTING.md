# Contributing to iCheck Attendance Management SaaS

This document provides guidelines for developing and contributing to the iCheck project.

## Project Structure

The project follows a feature-based architecture. See [STRUCTURE.md](./STRUCTURE.md) for a detailed overview of the directory layout.

### Key Directories

- **`src/app`** - Next.js App Router routes and layouts
  - `(dashboard)` - Protected dashboard routes
  - `(marketing)` - Public marketing pages
  - `api` - API routes organized by feature
- **`src/components`** - React components organized by category
- **`src/features`** - Feature-based modules (attendance, classrooms, reports)
- **`src/lib`** - Utilities and helpers
- **`src/types`** - Centralized type definitions

## Development Workflow

### Creating a New Feature

1. Create a new directory in `src/features/{feature-name}`
2. Structure it with:
   ```
   src/features/{feature-name}/
   ├── components/
   ├── services/
   ├── types.ts
   ├── constants.ts
   └── index.ts
   ```

3. Export types, constants, and components from `index.ts`
4. Use the feature in pages via `import { Component } from '@/features/{feature-name}'`

### Component Organization

- **`ui/`** - Reusable UI components (buttons, inputs, tables, etc.)
- **`dashboard/`** - Dashboard-specific components
- **`marketing/`** - Marketing page components
- **`common/`** - Shared components used across the app
- **`auth/`** - Authentication-related components

### Adding API Routes

1. Create routes under `src/app/api/v1/{feature}`
2. Use the API response helpers:
   ```typescript
   import { successResponse, errorResponse } from '@/lib/api';
   
   export async function GET(req) {
     try {
       const data = await fetchData();
       return successResponse(data);
     } catch (error) {
       return errorResponse('Failed to fetch', 'FETCH_ERROR', 500);
     }
   }
   ```

3. Always use error handling middleware for consistency

## Code Style

### TypeScript

- Use strict typing - avoid `any` types
- Define types in centralized `src/types` or feature-specific `types.ts`
- Use discriminated unions for error handling
- Export types as named exports

### Components

- Use functional components with hooks
- Keep components focused and single-responsibility
- Extract complex logic into custom hooks or services
- Use TypeScript for prop types (avoid PropTypes)

### Naming Conventions

- Components: PascalCase (`UserProfile.tsx`)
- Utils/helpers: camelCase (`getUserData.ts`)
- Types: PascalCase (`UserProfile.ts`)
- Constants: UPPER_SNAKE_CASE (`USER_ROLES.ts`)
- Files: kebab-case for utility files (`user-helpers.ts`)

## Imports

### Path Aliases

Use configured path aliases for cleaner imports:

```typescript
// Good
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks';

// Avoid
import { User } from '../../types';
import { Button } from '../../../../components/ui/button';
```

### Import Organization

1. External packages
2. Internal types
3. Internal components/utilities
4. Relative imports (if necessary)

```typescript
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks';
import './styles.css';
```

## Testing

### Test File Location

Create test files alongside the code they test:

```
src/features/attendance/
├── services/
│   ├── attendance.service.ts
│   ├── attendance.service.test.ts
```

### Test Naming

- Test files: `{name}.test.ts` or `{name}.spec.ts`
- Describe blocks: feature/function name
- Test cases: clear, behavior-focused descriptions

## Database and API

### Database Queries

- Use parameterized queries to prevent SQL injection
- Always include proper error handling
- Add type safety with TypeScript

### API Response Format

All API responses follow a consistent format:

```typescript
{
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: Record<string, any>;
  };
  timestamp: string;
}
```

## Git Workflow

### Branch Naming

- Feature: `feature/{description}`
- Bug fix: `fix/{description}`
- Refactor: `refactor/{description}`

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add attendance check-in feature
fix: resolve classroom sync issue
docs: update API documentation
refactor: simplify error handling middleware
```

### Pull Requests

1. Create a feature branch
2. Make your changes
3. Ensure all tests pass
4. Create a PR with a clear description
5. Wait for review before merging

## Performance

- Use React.memo for expensive components
- Implement code splitting with dynamic imports
- Optimize images and assets
- Use SWR or React Query for data fetching
- Profile and monitor bundle size

## Security

- Never commit secrets or API keys
- Use environment variables for sensitive data
- Sanitize user input
- Implement proper authentication/authorization
- Follow OWASP guidelines

## Documentation

- Update README.md for major changes
- Add JSDoc comments for complex functions
- Update STRUCTURE.md if you restructure directories
- Include examples for new features

## Questions?

Refer to:
- [STRUCTURE.md](./STRUCTURE.md) - Directory and project structure
- `.env.example` - Environment variable requirements
- Existing feature implementations for patterns
