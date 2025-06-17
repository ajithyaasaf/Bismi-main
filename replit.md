# Bismi Chicken Shop Management System

## Overview

This is a full-stack web application for managing a chicken shop business. The system handles suppliers, inventory, customers, orders, transactions, and generates reports. It uses a split deployment architecture with a React frontend and Node.js/Express backend, utilizing Firestore as the database.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation
- **PDF Generation**: Multiple libraries (html2pdf.js, jsPDF, html2canvas) for invoice generation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Database**: Firestore (Google Cloud Firestore)
- **API Design**: RESTful API with centralized error handling
- **Storage Pattern**: Interface-based storage abstraction layer
- **Authentication**: Firebase Admin SDK for server-side operations

### Deployment Strategy
- **Backend**: Deployed on Render at `https://bismi-main.onrender.com`
- **Frontend**: Can be deployed to Vercel, Netlify, or other static hosting platforms
- **Configuration**: Environment-based configuration with production/development splits

## Key Components

### Data Models
- **Suppliers**: Vendor management with pending amounts tracking
- **Inventory**: Stock management with type categorization
- **Customers**: Customer management with classification (hotel/random)
- **Orders**: Order processing with item details and payment tracking
- **Transactions**: Financial transaction recording for payments and expenses

### Core Features
1. **Dashboard**: Real-time overview of business metrics
2. **Supplier Management**: Add, edit, delete suppliers with payment tracking
3. **Inventory Management**: Stock tracking with automatic updates
4. **Customer Management**: Customer database with pending amounts
5. **Order Processing**: Complete order lifecycle management
6. **Transaction Tracking**: Financial record keeping
7. **Report Generation**: Business analytics and PDF exports
8. **Invoice Generation**: Professional PDF invoice creation

### UI Components
- Modular component architecture using Radix UI primitives
- Responsive design with mobile-first approach
- Form components with validation and error handling
- Modal dialogs for complex workflows
- Data tables with sorting and filtering capabilities

## Data Flow

### Request Flow
1. Frontend makes API requests using centralized `apiRequest` function
2. Requests routed through Express.js backend
3. Backend validates requests using Zod schemas
4. Storage layer abstracts database operations
5. Firestore handles data persistence
6. Response flows back through the same path

### State Management
- Server state managed by TanStack Query with automatic caching
- Local component state using React hooks
- Form state managed by React Hook Form
- No global client-side state management (API-first approach)

### Real-time Updates
- Manual cache invalidation after mutations
- Optimistic updates for better user experience
- Error handling with automatic retries for network issues

## External Dependencies

### Production Dependencies
- **@radix-ui/***: UI component primitives
- **@tanstack/react-query**: Server state management
- **firebase-admin**: Server-side Firebase operations
- **express**: Web framework
- **zod**: Runtime type validation
- **uuid**: Unique identifier generation
- **cors**: Cross-origin resource sharing
- **react-hook-form**: Form handling
- **tailwindcss**: Utility-first CSS framework

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking
- **tsx**: TypeScript execution
- **esbuild**: JavaScript bundler

### External Services
- **Firestore**: NoSQL document database
- **Firebase Admin SDK**: Server-side Firebase operations
- **Render**: Backend hosting platform

## Deployment Strategy

### Backend (Render)
- Already deployed and operational at `https://bismi-main.onrender.com`
- Handles all API endpoints under `/api/*` prefix
- Uses Firebase Admin SDK for secure database access
- Configured for automatic deployments from Git

### Frontend (Static Hosting)
- Built using `vite build` command
- Output directory: `dist/public`
- Can be deployed to multiple platforms:
  - Vercel (primary recommendation)
  - Netlify
  - Render Static Sites
  - GitHub Pages

### Environment Configuration
- Development: Uses local development server with API proxy
- Production: Frontend connects directly to Render backend
- CORS configured for cross-origin requests
- Environment variables for API endpoints

### Build Process
1. `npm run build` compiles both frontend and backend
2. Frontend assets go to `dist/public`
3. Backend compiled to `dist/index.js`
4. Deployment files copied for static hosting platforms

## Changelog
- June 17, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.