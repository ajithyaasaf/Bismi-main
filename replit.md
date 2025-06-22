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
- **Frontend**: Can be deployed to Netlify, Render Static Sites, or other static hosting platforms
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
- June 17, 2025. Fixed Vercel deployment configuration - simplified vercel.json to resolve MIME type errors and module loading issues
- June 17, 2025. Fixed CORS policy to allow requests from Vercel domain (bismi-main.vercel.app) to Render backend
- June 17, 2025. Fixed transactions API endpoint to return proper JSON instead of HTML - added Content-Type headers and improved error handling
- June 17, 2025. Fixed API response handling across all service files - implemented safeJsonResponse utility to properly handle non-JSON responses and prevent parsing errors when API returns HTML error pages
- June 18, 2025. Replaced spinner with skeleton loading system - removed main page spinner and implemented centralized skeleton components for all pages with 0.5-second minimum display time
- June 18, 2025. Fixed Rate field input issues across all order forms - corrected property mismatch between 'rate' and 'price' in NewOrderModal and OrderForm components, updated OrderItem interface to include rate and details properties
- June 18, 2025. Fixed production JavaScript TypeError: Cannot read properties of undefined (reading 'toFixed') - updated Order type property access from 'total' to 'totalAmount' and 'status' to 'paymentStatus', added null safety checks for all numeric values before calling .toFixed()
- June 18, 2025. Fixed orders page delete functionality - corrected prop name mismatch between OrdersList component expecting 'onDelete' and OrdersPage passing 'onDeleteOrder', updated interface to use consistent prop names
- June 18, 2025. Comprehensive Google-standard bug fixes - Fixed property name inconsistencies (rate vs price), implemented standardized date handling utilities, added null safety checks throughout, improved transaction type validation, enhanced inventory management logic, added React error boundary, standardized API response format, improved WhatsApp link generation with smart country code detection
- June 21, 2025. Fixed critical pending amount calculation bug - corrected property name mismatch in customer service (order.status vs order.paymentStatus, order.total vs order.totalAmount) causing incorrect pending amount displays
- June 21, 2025. Enterprise reports system implementation - rebuilt reports page with real-time data calculation using PendingAmountCalculator, added responsive date range picker with popover UI, implemented auto-refresh functionality, enhanced UX with gradient cards and loading skeletons, added comprehensive error handling and data validation
- June 21, 2025. Fixed custom date range timezone issue - normalized custom date picker to use local timezone with proper start/end of day handling, ensuring accurate date filtering for reports
- June 21, 2025. Enterprise CSV export system implementation - rebuilt ReportGenerator with professional multi-format export options (detailed reports, business analytics, executive summaries), added proper CSV escaping, comprehensive data validation, progress indicators, and timestamped file naming for audit compliance
- June 21, 2025. Fixed WhatsApp pending amount display bug - WhatsApp messages now show the same pending amount as customer page (stored amount) instead of calculated real-time amount, ensuring consistency across the application
- June 21, 2025. Implemented order-specific partial payment tracking system - Added paidAmount field to Order model, enhanced payment status with 'partially_paid', updated OrdersList component with detailed payment information display, created OrderPaymentModal for order-specific payments, modified PendingAmountCalculator to handle partial payments per order, updated Firestore storage layer for proper payment tracking
- June 21, 2025. Enhanced all NewOrderModal forms with mobile-responsive design and partial payment feature - Updated NewOrderModal, NewOrderModalV2, and OrderForm components with real-time payment calculation, integrated partial payment input with automatic status detection, improved touch targets and spacing for mobile devices, added visual payment summary with color-coded status badges, ensured consistency across all order creation forms
- June 22, 2025. Enhanced WhatsApp message templates for partial payment system - Updated WhatsApp service to display detailed payment status (Fully Paid, Partially Paid, Pending), added payment breakdown showing paid/remaining amounts, enhanced closing messages with payment reminders, improved message formatting with emojis and professional branding for better customer communication
- June 22, 2025. Implemented enterprise-level mobile-optimized PDF invoice generation - Fixed broken PDF system, created SimplePDFService with mobile device detection, automatic layout optimization for small screens, direct print functionality for mobile devices, and enhanced touch targets for better mobile usability. PDF generation now works seamlessly on both mobile and desktop with professional invoice templates
- June 22, 2025. Updated invoice templates with correct business information - Removed GST number field from all invoice templates and forms, updated UPI payment details to use correct UPI ID (barakathnisha004@okicici) and account name (Barakath Nisha), enhanced payment section with QR code placeholder for better mobile payment experience
- June 22, 2025. Fixed invoice generation JavaScript errors - Resolved "e.map is not a function" error by fixing property name mismatches in InvoiceTemplate (order.status→paymentStatus, order.total→totalAmount, order.date→createdAt), added array safety checks, simplified terms to single line "For queries regarding this invoice, please contact us", updated QR code placeholder design with styled blue phone icon

## User Preferences

Preferred communication style: Simple, everyday language.