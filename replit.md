# Bismi Chicken Shop Management System

## Overview
This is a full-stack web application designed for comprehensive management of a chicken shop business. Its primary purpose is to provide precise financial calculations, streamline operations, and generate insightful reports. The system manages suppliers, inventory, customers, orders, and financial transactions. It aims to eliminate calculation mistakes in analytics, providing a reliable platform for business owners.

## User Preferences
Preferred communication style: Simple, everyday language.

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

## External Dependencies
- **UI/UX**: `@radix-ui/*`, `tailwindcss`
- **State Management**: `@tanstack/react-query`
- **Backend/Database**: `firebase-admin`, `express`, `firestore`
- **Validation**: `zod`
- **Forms**: `react-hook-form`
- **Utilities**: `uuid`, `cors`
- **Hosting**: Render (for backend)