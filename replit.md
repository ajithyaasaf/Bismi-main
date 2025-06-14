# Bismi Chicken Shop Management System

## Overview

This is a comprehensive web application developed for Bismi Chicken Shop to manage their business operations. The system provides complete inventory management, order processing, customer relations, supplier management, and financial tracking capabilities. The application is built with modern web technologies and follows a client-server architecture with multiple deployment strategies.

## System Architecture

The application follows a client-server architecture with the following key components:

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Query (TanStack Query) for server state management and caching
- **UI Framework**: Shadcn UI components with Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **Form Handling**: React Hook Form with Zod schema validation
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript for full-stack type safety
- **API Design**: RESTful API with structured endpoints
- **Build System**: ESBuild for server-side bundling

### Data Storage Solutions
The application uses a dual Firebase SDK architecture:

1. **Backend Storage - Firebase Admin SDK**: Enterprise-level server-side operations through API routes
2. **Frontend Real-time - Firebase Client SDK**: Real-time UI updates and client-side data synchronization
3. **Fallback Storage**: In-memory storage for development environments
4. **Database Schema**: Drizzle ORM with PostgreSQL support (prepared for future migrations)

The storage manager automatically selects the appropriate storage backend based on environment variables.

## Key Components

### Business Logic Modules
1. **Inventory Management**: Track stock levels, rates, and categories for meat products
2. **Order Processing**: Create and manage customer orders with automatic inventory updates
3. **Customer Management**: Handle both B2B (Hotels) and B2C (Random) customers
4. **Supplier Management**: Track supplier relationships and outstanding debts
5. **Transaction Processing**: Record payments, receipts, and expenses
6. **Reporting System**: Generate sales reports and financial summaries

### Core Services
- **Storage Manager**: Handles database operations with automatic failover
- **Balance Validator**: Ensures financial data integrity
- **PDF Generation**: Enterprise-grade invoice and report generation
- **Firebase Admin SDK**: Server-side secure operations for data mutations
- **Firebase Client SDK**: Real-time data synchronization for live UI updates

### UI Components
- **Dashboard**: Business metrics overview with charts and alerts
- **Data Tables**: Sortable, filterable lists for all entities
- **Forms**: Validated input forms with error handling
- **Modals**: Context-aware dialogs for actions and confirmations
- **Invoice Generator**: Professional PDF invoice creation

## Data Flow

### Client-Side Real-time Operations (Firebase Client SDK)
1. **User Interaction**: Users interact through React components
2. **Real-time Data**: Firebase Client SDK provides live data synchronization for UI
3. **Local State**: React Query caches real-time data and manages UI state

### Server-Side Operations (Firebase Admin SDK)
1. **Data Mutations**: Create, update, delete operations through API routes
2. **Server Validation**: Express server validates and processes requests
3. **Secure Operations**: Firebase Admin SDK handles secure database operations
4. **Response Handling**: API responses trigger client-side cache invalidation

### Dual SDK Benefits
- **Security**: Admin SDK ensures secure server-side operations
- **Performance**: Client SDK provides instant UI updates without API round trips
- **Reliability**: Fallback mechanisms ensure application stability

### Authentication & Authorization
Currently operates without authentication (suitable for single-business use). The system is designed to be extended with user authentication if needed.

## External Dependencies

### Core Dependencies
- **Firebase**: Cloud database and real-time synchronization
- **Chart.js**: Data visualization for business metrics
- **React Query**: Server state management and caching
- **Zod**: Schema validation for forms and API data
- **React Hook Form**: Form state management
- **jsPDF & html2canvas**: PDF generation capabilities

### Development Dependencies
- **Vite**: Development server and build tool
- **TypeScript**: Type checking and compilation
- **Tailwind CSS**: Styling framework
- **ESBuild**: Server bundling

### Cloud Services
- **Firebase/Firestore**: Primary database for production
- **Vercel**: Deployment platform (configured)
- **Replit**: Development environment

## Deployment Strategy

The application supports multiple deployment strategies:

### Development Environment
- **Platform**: Replit with live reloading
- **Storage**: In-memory storage for fast development
- **Build**: Vite dev server with HMR

### Production Deployment
- **Platform**: Vercel with serverless functions
- **Storage**: Firebase/Firestore for data persistence
- **CDN**: Static assets served via Vercel's global CDN
- **Build**: Optimized production builds with code splitting

### Build Configuration
- **Client Build**: Vite produces optimized static assets
- **Server Build**: ESBuild creates serverless-compatible bundles
- **Environment Variables**: Automatic environment detection
- **Error Handling**: Comprehensive error boundaries and logging

The application includes specialized build scripts and configuration files for seamless Vercel deployment, with automatic environment detection and storage backend selection.

## Changelog

- June 14, 2025. **Firebase Integration Completed**
  - Fixed Firebase environment variables configuration
  - Added Firebase service account key authentication
  - Enhanced serverless function error handling for Vercel deployment
  - Updated API routes with proper CORS headers and Firebase initialization
  - All data operations now working with Firestore database
- June 13, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.