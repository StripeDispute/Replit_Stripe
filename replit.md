# Stripe Dispute Assistant

## Overview

The Stripe Dispute Assistant is a web application designed to help businesses efficiently manage and respond to Stripe payment disputes. The application automatically fetches disputes from Stripe, provides intelligent evidence management through categorized file uploads, and generates professional PDF evidence packets for submission. Built with a modern TypeScript stack, it emphasizes clarity, trust, and operational efficiency through a Stripe-inspired fintech design system.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component System**: shadcn/ui components built on Radix UI primitives, providing accessible and customizable components following the "New York" style variant

**Design System**: Stripe-inspired fintech design with Material Design principles for data-dense interfaces. Uses Inter font for primary text and JetBrains Mono for monospace/technical data. The design emphasizes trust, clarity, and efficiency through a neutral color palette with HSL-based theming supporting both light and dark modes.

**Styling**: Tailwind CSS with custom design tokens for colors, spacing, shadows, and typography. Includes custom hover and elevation effects (`hover-elevate`, `active-elevate-2`) for interactive elements.

**State Management**: TanStack Query (React Query) for server state management, data fetching, caching, and synchronization with infinite stale time configuration

**Authentication**: Replit Auth (OpenID Connect) for user authentication with support for Google, GitHub, X, Apple, and email/password login. Protected routes require authentication, unauthenticated users see landing page.

**Routing**: Wouter for lightweight client-side routing with the following structure:
- `/` - Landing page for unauthenticated users, Dashboard for authenticated users
- `/app` - Dashboard with dispute metrics (protected)
- `/app/disputes` - Filterable dispute list (protected)
- `/app/disputes/:stripeId` - Individual dispute detail with evidence management (protected)
- `/app/settings` - Integration and configuration settings (protected)

**Form Handling**: React Hook Form with Zod resolvers for type-safe validation aligned with shared schemas

### Backend Architecture

**Runtime**: Node.js with Express.js server framework

**Language**: TypeScript with ES modules throughout

**API Structure**: RESTful API organized into modular routers:
- `/api/disputes` - Dispute listing and retrieval from Stripe
- `/api/evidence/:stripeId` - Evidence file upload and management
- `/api/packets/:stripeId` - PDF evidence packet generation

**File Handling**: Multer middleware for multipart form uploads with 10MB file size limit, storing files in `server/uploads/` with timestamped, sanitized filenames

**PDF Generation**: PDFKit for creating professional evidence packets combining dispute details and uploaded evidence files

**Static File Serving**: Express static middleware serves uploaded files from `/static/uploads` and generated packets from `/static/packets`

**Development Mode**: Vite integration in middleware mode for hot module replacement during development

### Data Storage

**ORM**: Drizzle ORM for type-safe database access with Drizzle Kit for schema management and migrations

**Database**: PostgreSQL via Neon serverless driver (`@neondatabase/serverless`) with connection via `DATABASE_URL` environment variable. Schema defined in `shared/schema.ts` using Drizzle table definitions.

**Data Models**:
- **Users**: User profiles with email, first name, last name, and profile image URL. Required for Replit Auth integration
- **Sessions**: Session storage table for authentication session management (required for Replit Auth)
- **EvidenceFiles**: Tracks uploaded evidence with fields for `userId` (for multi-tenant scoping), `stripeId`, `kind` (invoice, tracking, chat, tos, screenshot, other), filename, storage path, size, and timestamps
- **PdfPackets**: Records generated PDF evidence packets with `userId` (for multi-tenant scoping) and stripe dispute reference

**Multi-Tenant Architecture**: All evidence files and PDF packets are scoped by `userId` to ensure proper data isolation between users.

**Schema Validation**: Zod schemas in `shared/schema.ts` provide runtime validation and TypeScript types shared between client and server, including `Dispute`, `EvidenceFile`, `PdfPacket`, `User`, and associated insert schemas generated via `createInsertSchema` from Drizzle Zod.

### External Dependencies

**Payment Processing**: Stripe API (v2024-12-18.acacia) for dispute retrieval and management. Requires `STRIPE_SECRET_KEY` environment variable. Application gracefully handles missing configuration with 503 responses and warning messages.

**Database**: PostgreSQL via Neon serverless driver (`@neondatabase/serverless`) for production deployment compatibility

**UI Component Library**: Extensive use of Radix UI primitives for accessible, unstyled components including dialogs, dropdowns, popovers, tooltips, accordions, and form controls

**Fonts**: Google Fonts for Inter (primary UI), with JetBrains Mono for monospaced technical data and code

**Development Tools**: 
- Replit-specific plugins for error overlay, cartographer, and dev banner in non-production environments
- TypeScript for type safety across the stack
- ESBuild for production server bundling

**Build & Deployment**:
- Vite builds client to `dist/public`
- ESBuild bundles server to `dist/index.js` with external packages and ESM format
- Production mode serves built static files and runs bundled server