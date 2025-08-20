# Bismi Chicken Shop Management System

## Overview
This is a full-stack web application designed for comprehensive management of a chicken shop business. Its primary purpose is to provide precise financial calculations, streamline operations, and generate insightful reports. The system manages suppliers, inventory, customers, orders, and financial transactions. It aims to eliminate calculation mistakes in analytics, providing a reliable platform for business owners.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes
### August 20, 2025 - Order Date Editing Feature
- **Feature**: Added ability to edit order dates after creation
- **Implementation**: Created responsive OrderDateEditModal with calendar picker and added purple edit date button to orders table
- **Components**: New OrderDateEditModal.tsx, updated OrdersList.tsx and OrdersPage.tsx with date editing functionality
- **UX**: Mobile-first responsive design with tooltips, proper validation, and intuitive calendar interface
- **Impact**: Users can now correct order dates when mistakes are made during creation

### August 19, 2025 - PDF Order Date Sorting Fix
- **Issue**: Orders in customer PDF invoices were not sorted chronologically by date
- **Root Cause**: Filtered orders array was not being sorted before rendering in both preview and PDF generation
- **Solution**: Added date-based sorting in ascending order (oldest first) to both InvoiceTemplate.tsx and SimplePDFService.ts
- **Impact**: Order dates now appear in proper chronological order in PDF previews and downloads

### August 18, 2025 - Date Handling Bug Fix
- **Issue**: Orders were always displaying current date instead of user-selected date
- **Root Cause**: Backend schema validation defaulting to current date when date parsing failed
- **Solution**: Enhanced date validation in API schema and removed fallback to current date in storage layer
- **Impact**: Users can now create orders with accurate past, present, or future dates

## System Architecture
### Frontend
- **Framework**: React 18 with TypeScript, using Vite for building.
- **UI/UX**: Radix UI components styled with Tailwind CSS for a responsive, mobile-first design.
- **State Management**: TanStack Query for server state and React hooks for local state.
- **Form Handling**: React Hook Form with Zod validation.
- **PDF Generation**: Utilizes multiple libraries for professional PDF invoice creation.

### Backend
- **Runtime**: Node.js with Express.js, written in TypeScript.
- **Database**: Google Cloud Firestore, accessed via Firebase Admin SDK.
- **API Design**: RESTful API with centralized error handling and an interface-based storage abstraction layer.

### Deployment
- **Backend**: Deployed on Render.
- **Frontend**: Designed for static hosting platforms like Netlify or Render Static Sites.
- **Configuration**: Environment-based configuration separates development and production settings.

### Core Features
- **Dashboard**: Real-time business metrics overview.
- **Management Modules**: Dedicated sections for Suppliers, Inventory, Customers, Orders, and Transactions.
- **Report Generation**: Business analytics and PDF exports, including professional invoice generation.
- **Financial Precision**: Comprehensive calculation system to ensure accuracy in all financial analytics, including pending amounts, partial payments, and hotel debt tracking.
- **Payment Allocation**: Smart payment allocation system allowing customers to distribute payments across specific orders.
- **Date Handling**: Robust date selection and storage system supporting past, present, and future order dates with proper timezone handling.

## External Dependencies
- **UI/UX**: `@radix-ui/*`, `tailwindcss`
- **State Management**: `@tanstack/react-query`
- **Backend/Database**: `firebase-admin`, `express`, `firestore`
- **Validation**: `zod`
- **Forms**: `react-hook-form`
- **Utilities**: `uuid`, `cors`
- **Hosting**: Render (for backend)