# iCheck Attendance Management SaaS

A modern, scalable attendance management system built with Next.js 16, featuring real-time updates, comprehensive reporting, and a professional dashboard interface.

## Features

- **Real-time Attendance Tracking** - Live attendance check-ins with WebSocket support
- **Classroom Management** - Create and manage multiple classrooms with flexible configurations
- **Advanced Reporting** - Comprehensive attendance reports and analytics
- **Multi-role Support** - Admin, teacher, and student roles with appropriate permissions
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **RESTful API** - Well-organized, versioned API endpoints

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: PostgreSQL (via environment configuration)
- **Real-time**: WebSockets with STOMP protocol
- **API Client**: Built-in server actions and REST endpoints

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your database and other services in `.env.local`

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

### Build & Production

Build for production:
```bash
npm run build
npm start
```

## Project Structure

The project follows a scalable feature-based architecture. See [STRUCTURE.md](./STRUCTURE.md) for detailed information about:

- Directory organization
- Feature modules (attendance, classrooms, reports)
- Component hierarchy
- API organization
- Type and utility management

## Development Guidelines

Please refer to [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- Code style and conventions
- Git workflow
- Component patterns
- API integration patterns
- Testing guidelines

## Key Directories

```
src/
├── app/                 # Next.js App Router
│   ├── (dashboard)      # Protected dashboard routes
│   ├── (marketing)      # Public marketing pages
│   └── api/v1/          # Versioned API routes
├── components/          # Reusable React components
├── features/            # Feature-based modules
├── lib/                 # Utilities and helpers
│   ├── api/             # API utilities
│   ├── auth/            # Authentication helpers
│   └── utils/           # General utilities
├── types/               # Centralized type definitions
└── middleware.ts        # Next.js middleware
```

## API Documentation

All API endpoints follow a consistent response format and are versioned under `/api/v1/`. 

### Response Format

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

## Real-time Updates

The application uses WebSockets with STOMP protocol for real-time features. Configure WebSocket settings in your environment:

```bash
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

## Environment Variables

See `.env.example` for all required environment variables.

## Deployment

Deploy to Vercel with a single click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ffullstack-gen2%2Ficheck)

Or follow [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for other platforms.

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui Components](https://ui.shadcn.com)

## License

This project is proprietary and confidential.

## Support

For issues, questions, or suggestions, please open an issue in the repository or contact the development team.
