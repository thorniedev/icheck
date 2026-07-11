# Quick Reference Guide

A fast lookup guide for common tasks in the iCheck project.

## Directory Quick Links

| What | Location |
|------|----------|
| Dashboard pages | `src/app/(dashboard)/` |
| Public pages | `src/app/(marketing)/` |
| API endpoints | `src/app/api/v1/` |
| Features | `src/features/` |
| Components | `src/components/` |
| Types | `src/types/` |
| Utilities | `src/lib/` |

## Common Tasks

### Adding a New Page

1. Create file in `src/app/(dashboard)/your-page/page.tsx` or `src/app/(marketing)/your-page/page.tsx`
2. Export default React component
3. Add metadata for SEO

```typescript
export const metadata = {
  title: 'Page Title - iCheck',
  description: 'Page description',
};

export default function Page() {
  return <div>Page content</div>;
}
```

### Creating a New Component

1. Identify category: `ui`, `dashboard`, `marketing`, `common`, or `auth`
2. Create file: `src/components/{category}/component-name.tsx`
3. Export from category index: `src/components/{category}/index.ts`

```typescript
// src/components/ui/custom-button.tsx
export function CustomButton({ children, ...props }) {
  return <button {...props}>{children}</button>;
}

// src/components/ui/index.ts
export { CustomButton } from './custom-button';

// Usage
import { CustomButton } from '@/components/ui';
```

### Adding a New Feature

1. Create directory: `src/features/feature-name/`
2. Create subdirectories: `components/`, `services/`
3. Create files: `types.ts`, `constants.ts`, `index.ts`
4. Implement barrel exports

```typescript
// src/features/feature-name/index.ts
export * from './types';
export * from './constants';
export { default as FeatureComponent } from './components/component-name';
```

### Creating an API Endpoint

1. Create file: `src/app/api/v1/{feature}/route.ts`
2. Use response helpers:

```typescript
import { successResponse, errorResponse } from '@/lib/api';

export async function GET(req: Request) {
  try {
    const data = await fetchData();
    return successResponse(data);
  } catch (error) {
    return errorResponse('Error message', 'ERROR_CODE', 500);
  }
}
```

### Using Types

```typescript
// Import from centralized types
import { User, AttendanceRecord, ClassroomData } from '@/types';

// Or feature-specific types
import { AttendanceStatus } from '@/features/attendance';
```

### Importing Utilities

```typescript
// API utilities
import { successResponse, errorResponse, ApiError } from '@/lib/api';

// Auth utilities
import { getCurrentUser } from '@/lib/auth';

// General utilities
import { formatSchoolTime } from '@/lib/utils';
```

## Common Patterns

### Fetching Data in Server Component

```typescript
import { getCurrentUser } from '@/lib/auth';

export default async function Component() {
  const user = await getCurrentUser();
  
  return <div>Hello {user.name}</div>;
}
```

### Using SWR for Client-Side Data

```typescript
'use client';

import useSWR from 'swr';

export function Component() {
  const { data, error, isLoading } = useSWR('/api/v1/data', fetch);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error</div>;
  
  return <div>{JSON.stringify(data)}</div>;
}
```

### Error Handling in API Routes

```typescript
import { handleApiError, ApiError } from '@/lib/api';

export async function GET(req: Request) {
  try {
    if (!authenticated) {
      throw new ApiError('Not authorized', 'UNAUTHORIZED', 401);
    }
    // ... logic
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Creating a Custom Hook

```typescript
// src/features/feature-name/hooks/useFeature.ts
import { useState, useEffect } from 'react';

export function useFeature() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // fetch logic
  }, []);
  
  return { data, loading };
}

// Usage
import { useFeature } from '@/features/feature-name';
```

## Import Paths

Always use path aliases, not relative imports:

```typescript
// Good
import { Button } from '@/components/ui/button';
import { User } from '@/types';
import { getCurrentUser } from '@/lib/auth';

// Avoid
import { Button } from '../../../../../components/ui/button';
import { User } from '../../types';
```

## Environment Variables

Required variables in `.env.local`:

```
# Database
DATABASE_URL=

# Auth
NEXT_PUBLIC_AUTH_URL=

# WebSocket
NEXT_PUBLIC_WS_URL=

# API
NEXT_PUBLIC_API_BASE_URL=
```

## Debugging

### View logs in development

```typescript
// Use descriptive console.log messages
console.log('[Feature] Operation completed:', data);

// In production, check server logs
// Use error reporting service integration
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Import not found | Check path alias in tsconfig.json, use `@/` prefix |
| Component not rendering | Verify it's exported from index.ts, check route exists |
| API endpoint 404 | Check `src/app/api/v1/{feature}/route.ts` exists |
| Type errors | Ensure types are exported from `src/types/index.ts` |

## Useful Commands

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start

# Linting
npm run lint

# Type check
npm run type-check

# Format code
npm run format
```

## Resources

- Full structure guide: [STRUCTURE.md](./STRUCTURE.md)
- Development guidelines: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Restructuring details: [RESTRUCTURING_SUMMARY.md](./RESTRUCTURING_SUMMARY.md)
- Main README: [README.md](./README.md)

## Getting Help

1. Check the relevant markdown file above
2. Look at similar feature implementations
3. Refer to Next.js docs: https://nextjs.org/docs
4. Check component source in `src/components/`
