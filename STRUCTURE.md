# iCheck Attendance Management SaaS - Project Structure

This document outlines the restructured project architecture following Next.js SaaS best practices.

## Directory Overview

```
src/
├── app/                    # Next.js App Router pages and routes
├── components/             # Reusable UI components organized by feature
├── features/              # Feature-based vertical slices
├── lib/                   # Shared utilities, helpers, and services
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
├── store/                 # Redux state management
├── middleware.ts          # Next.js middleware for auth/routing
└── auth.ts               # NextAuth configuration
```

## 1. App Routes (`src/app/`)

### Route Groups

#### `(dashboard)` - Admin/Teacher Dashboard
Protected routes for school staff to manage attendance and classes.

```
(dashboard)/
├── page.tsx                 # Dashboard overview
├── layout.tsx              # Dashboard layout with sidebar
├── classrooms/             # Classroom management
│   ├── page.tsx            # List all classrooms
│   └── [id]/               # Classroom detail & attendance
├── attendance/             # Attendance records
├── reports/                # Attendance reports & analytics
├── schedule/               # Class schedule management
├── students/               # Student management
├── teachers/               # Teacher management
├── settings/               # Dashboard settings
├── amendments/             # Attendance amendments
└── sessions/               # QR code session management
```

#### `(auth)` - Authentication
Public routes for login/signup.

```
(auth)/
└── login/
    └── page.tsx            # Login page with OAuth options
```

#### `(student)` - Student Portal
Student-specific views and features.

```
(student)/
└── student/
    ├── page.tsx            # Student dashboard
    └── require-permission/ # Permission request
```

#### `(marketing)` - Marketing Pages
Public landing pages and informational content.

```
(marketing)/
├── page.tsx                # Landing page
├── features/               # Features showcase
├── pricing/                # Pricing page
├── privacy/                # Privacy policy
├── contact/                # Contact form
└── data-deletion/          # GDPR data deletion
```

### API Routes (`app/api/`)

```
api/
├── v1/                     # API v1 routes (versioned)
│   ├── attendance/         # Attendance endpoints
│   ├── classrooms/         # Classroom endpoints
│   ├── reports/            # Reports endpoints
│   └── users/              # User management endpoints
├── auth/                   # Authentication endpoints
├── webhooks/               # External service webhooks
└── client-ip/              # Client detection utilities
```

## 2. Components (`src/components/`)

Organized by feature and purpose for better scalability.

### `ui/`
Reusable shadcn/ui components and basic UI primitives.

```
ui/
├── button.tsx
├── dialog.tsx
├── form.tsx
├── data-table.tsx
└── ... other shadcn components
```

### `dashboard/`
Dashboard-specific components.

```
dashboard/
├── classrooms/             # Classroom-related components
│   ├── classroom-form-dialog.tsx
│   ├── classrooms-list.tsx
│   ├── classrooms-browser.tsx
│   └── enrollment-client.tsx
├── attendance/             # Attendance-related components
│   └── ... attendance components
├── reports/                # Report components
│   ├── chart-area-interactive.tsx
│   └── ... report charts
└── shared/                 # Dashboard shared components
    ├── dashboard-layout.tsx
    └── breadcrumb.tsx
```

### `common/`
Shared components used across the entire application.

```
common/
├── app-sidebar.tsx         # Main application sidebar
├── header.tsx              # App header
├── nav-main.tsx            # Main navigation
├── nav-user.tsx            # User navigation menu
├── notification-bell.tsx   # Notifications
├── logo.tsx                # Brand logo
└── modal.tsx               # Modal wrapper
```

### `marketing/`
Landing page and marketing components.

```
marketing/
├── hero.tsx
├── features-section.tsx
├── pricing-cards.tsx
└── cta-section.tsx
```

### `auth/`
Authentication-related components.

```
auth/
├── login-form.tsx
├── oauth-buttons.tsx
└── auth-layout.tsx
```

## 3. Features (`src/features/`)

Feature-based vertical slices containing all related code in one place.

### Structure
Each feature folder contains:
- `components/` - Feature-specific UI components
- `hooks/` - Custom hooks for this feature
- `services/` - API calls and business logic
- `types.ts` - TypeScript interfaces for this feature
- `constants.ts` - Feature-specific constants
- `index.ts` - Barrel exports for clean imports

### Features

#### `attendance/`
QR code check-in, attendance tracking, and amendments.

```
attendance/
├── components/
│   ├── qr-scanner.tsx
│   ├── check-in-form.tsx
│   └── attendance-status.tsx
├── hooks/
│   ├── use-attendance.ts
│   └── use-qr-scan.ts
├── services/
│   ├── attendance-api.ts
│   └── qr-token-service.ts
├── types.ts                # Attendance types
├── constants.ts            # Attendance constants
└── index.ts
```

#### `classrooms/`
Classroom management, QR sessions, and enrollment.

```
classrooms/
├── components/
│   ├── classroom-form.tsx
│   ├── classroom-card.tsx
│   └── qr-session-manager.tsx
├── hooks/
│   ├── use-classrooms.ts
│   └── use-enrollment.ts
├── services/
│   ├── classrooms-api.ts
│   └── enrollment-api.ts
├── types.ts
├── constants.ts
└── index.ts
```

#### `reports/`
Attendance reports, analytics, and exports.

```
reports/
├── components/
│   ├── attendance-chart.tsx
│   ├── report-filters.tsx
│   └── export-button.tsx
├── hooks/
│   ├── use-reports.ts
│   └── use-report-export.ts
├── services/
│   └── reports-api.ts
├── types.ts
├── constants.ts
└── index.ts
```

## 4. Lib (`src/lib/`)

Shared utilities, helpers, and services.

### `api/`
API client and utilities.

```
api/
├── api-client.ts           # HTTP client wrapper
├── api-config.ts           # API configuration
├── api-fetch.ts            # Fetch wrapper
└── error-utils.ts          # Error handling utilities
```

### `auth/`
Authentication and authorization utilities.

```
auth/
├── session-helpers.ts      # Session management
├── permissions.ts          # Permission checking
├── qr-token.ts            # QR token utilities
└── refresh-tokens.ts      # Token refresh logic
```

### `utils/`
General-purpose utilities specific to iCheck domain.

```
utils/
├── classroom-helpers.ts    # Classroom utilities
├── school-time.ts          # Time zone and school time utilities
├── geolocation.ts          # Location services
├── check-in-error.ts       # Check-in error handling
├── device-cookie.ts        # Device identification
├── client-ip.ts            # Client IP detection
├── attendance-stream.ts    # Real-time attendance updates
└── session-window.ts       # Session timing utilities
```

### Root Utilities

```
lib/
├── utils.ts                # General utilities
└── constants.ts            # App-wide constants
```

## 5. Types (`src/types/`)

Centralized TypeScript type definitions.

```
types/
├── api.ts                  # API request/response types
├── models.ts               # Domain models (User, Classroom, etc.)
├── auth.ts                 # Authentication types
└── index.ts                # Barrel export
```

## 6. Hooks (`src/hooks/`)

Custom React hooks for common functionality.

```
hooks/
├── use-auth.ts             # Authentication state
├── use-user.ts             # Current user info
├── use-session.ts          # Session management
└── useLocalStorage.ts      # Local storage utilities
```

## 7. Store (`src/store/`)

Redux state management (existing structure maintained).

```
store/
├── slices/
├── middleware/
└── index.ts
```

## Routing & Navigation

### Public Routes (No Auth Required)
- `/` - Landing page
- `/features` - Features showcase
- `/pricing` - Pricing page
- `/privacy` - Privacy policy
- `/contact` - Contact form
- `/data-deletion` - GDPR data deletion
- `/login` - Login page

### Protected Routes (Auth Required)
- `/dashboard` - Admin/teacher dashboard
- `/dashboard/classrooms` - Classroom management
- `/dashboard/attendance` - Attendance records
- `/dashboard/reports` - Reports & analytics
- `/dashboard/students` - Student management
- `/dashboard/teachers` - Teacher management
- `/dashboard/schedule` - Schedule management
- `/dashboard/settings` - Settings

### Student Routes (Student Role)
- `/student` - Student dashboard

## Import Path Aliases

Configure these in `tsconfig.json` for cleaner imports:

```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@/components/*": ["./src/components/*"],
    "@/features/*": ["./src/features/*"],
    "@/lib/*": ["./src/lib/*"],
    "@/types/*": ["./src/types/*"]
  }
}
```

### Usage Examples

```typescript
// Instead of relative imports
import Button from '../../../components/ui/button'

// Use aliases
import Button from '@/components/ui/button'
import { useAttendance } from '@/features/attendance/hooks'
import { sessionHelpers } from '@/lib/auth/session-helpers'
import type { User } from '@/types/models'
```

## Best Practices

### 1. Component Organization
- Keep components focused on a single responsibility
- Use feature-based organization for feature-specific components
- Place shared components in `common/`
- Organize UI primitives in `ui/`

### 2. Type Safety
- Centralize types in `src/types/`
- Use feature-specific types within feature folders
- Export types from `index.ts` for clean imports

### 3. API Communication
- Use `lib/api/api-client.ts` for all HTTP requests
- Implement API calls in feature `services/`
- Export service functions from feature `index.ts`
- Handle errors consistently with error utilities

### 4. State Management
- Use Redux for global state (existing)
- Use React hooks for component-level state
- Use feature hooks for feature-specific state logic

### 5. File Naming
- Components: `PascalCase` (.tsx)
- Utilities/Hooks: `camelCase` (.ts or .tsx)
- Types: `PascalCase` for interfaces/types
- Constants: `UPPER_SNAKE_CASE`

### 6. Export Patterns
```typescript
// Feature barrel exports (feature/index.ts)
export * from './components'
export * from './hooks'
export * from './services'
export type * from './types'
export { constants } from './constants'
```

## Migration Notes

This restructuring maintains all existing functionality while improving organization:

- ✅ All routes remain functional
- ✅ NextAuth and OAuth continue to work
- ✅ Redux state management preserved
- ✅ API endpoints unchanged
- ✅ Component functionality maintained

## Future Improvements

- Add API versioning to routes
- Implement feature flags
- Add internationalization (i18n)
- Implement feature-based code splitting
- Add Storybook for component documentation
- Implement E2E tests with Playwright
