# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview
This is a demo Next.js application that implements a multi-level approval workflow system for employee leave requests. The system demonstrates hierarchical approval processes with OR/AND logic for approvers at different levels.

## High-Level Architecture

### Tech Stack
- **Framework**: Next.js 15.4.5 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Fonts**: Geist Sans & Geist Mono
- **Database**: SQLite with better-sqlite3
- **Data Storage**: SQLite database with persistent storage
- **Runtime**: React 19.1.0

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API Routes
│   │   ├── requests/      # CRUD operations for approval requests
│   │   ├── approve/       # Approval action endpoint
│   │   └── users/         # User management endpoint
│   ├── dashboard/         # Approver dashboard page
│   ├── request/          # Request submission page
│   ├── layout.tsx        # Root layout with fonts
│   └── page.tsx          # Home page
├── lib/
│   ├── data.ts           # Data access layer functions
│   └── db.ts             # SQLite database setup and operations
└── types/
    └── approval.ts       # TypeScript interfaces
```

## Data Models & Core Types

### User Interface
```typescript
interface User {
  id: string;
  name: string;
  role: string; // Employee, Team Lead, HR Manager, Department Head
}
```

### ApprovalRequest Interface
```typescript
interface ApprovalRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  requestType: string; // Sick Leave, Personal Leave, Vacation
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvalNodes: ApprovalNode[];
}
```

### ApprovalNode Interface
```typescript
interface ApprovalNode {
  id: string;
  level: number;        // Approval hierarchy level (1, 2, 3...)
  approvers: User[];    // Users who can approve at this level
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: User;    // Who approved (if approved)
  approvedAt?: string;  // When approved
  rejectedBy?: User;    // Who rejected (if rejected)
  rejectedAt?: string;  // When rejected
  requiresAll: boolean; // true = AND logic, false = OR logic
}
```

## Approval Workflow Logic

### Default Workflow Configuration
1. **Level 1**: Team Lead approval
   - Approvers: Jane Smith OR Bob Johnson (OR logic)
   - Either team lead can approve to proceed to next level
   
2. **Level 2**: HR Manager approval  
   - Approver: Alice Brown (AND logic - single approver)
   - Required after team lead approval

### Workflow Rules
- **Sequential Processing**: Each level must be approved before the next level becomes available
- **OR Logic**: When `requiresAll: false`, any one approver from the list can approve
- **AND Logic**: When `requiresAll: true`, all approvers must approve (though current implementation shows single approvers)
- **Rejection**: Any rejection at any level immediately rejects the entire request
- **Final Status**: Request is fully approved only when all levels are approved

## API Architecture

### `/api/requests` - Request Management
- **GET**: Retrieves all approval requests from SQLite database
- **POST**: Creates new approval request with predefined workflow
  - Auto-generates approval nodes with hardcoded approvers
  - Stores in SQLite database with relational integrity
  - Sets initial status to 'pending'

### `/api/users` - User Management
- **GET**: Retrieves all users from SQLite database
- Returns users for dropdown selection in dashboard

### `/api/approve` - Approval Actions
- **POST**: Processes approve/reject actions
- **Parameters**:
  - `requestId`: Target request
  - `nodeId`: Specific approval node
  - `approverId`: User performing the action
  - `action`: 'approve' or 'reject'
- **Database Operations**: Updates SQLite database with transaction safety

#### Approval Logic Flow
1. Validate request, node, and approver exist
2. Update node status and metadata (approver, timestamp)
3. If rejection: immediately set request status to 'rejected'
4. If approval: check if all previous nodes are approved
5. If all nodes approved: set request status to 'approved'

## Frontend Component Architecture

### Page Components

#### `/` - Home Page (`/src/app/page.tsx`)
- Landing page with navigation to request submission and dashboard
- Explains the approval workflow to users
- Static content with routing links

#### `/request` - Request Submission (`/src/app/request/page.tsx`)
- Client-side form for creating leave requests
- Form fields: employee name, request type, dates, reason
- Submits to `/api/requests` and redirects to dashboard

#### `/dashboard` - Approval Dashboard (`/src/app/dashboard/page.tsx`)
- Multi-user approval interface
- User selector to simulate different approvers
- Shows pending requests requiring the selected user's approval
- Displays complete approval workflow status
- Provides approve/reject buttons for actionable items

### Key Frontend Features

#### User Context Simulation
- Dropdown to switch between different approver roles
- Filters requests based on selected user's approval authority
- Only shows requests where user can currently take action

#### Workflow Visualization
- Shows complete approval chain for each request
- Indicates current approval level and status
- Displays who approved/rejected at each level
- Uses color coding for status (green=approved, red=rejected, yellow=pending)

#### Request Filtering Logic
```typescript
// Shows requests where:
// 1. User is an approver for a pending node
// 2. All previous approval levels are complete
const getRequestsForUser = () => {
  return requests.filter(request => {
    return request.approvalNodes.some(node => 
      node.status === 'pending' && 
      node.approvers.some(approver => approver.id === selectedUser.id) &&
      request.approvalNodes.slice(0, request.approvalNodes.indexOf(node))
        .every(prevNode => prevNode.status === 'approved')
    );
  });
};
```

## Data Flow

### Request Submission Flow
1. User fills form in `/request` page
2. Form submits to `/api/requests` POST
3. API creates request with predefined approval nodes
4. Request stored in SQLite database with proper relationships
5. User redirected to dashboard

### Approval Flow
1. Dashboard fetches users from `/api/users` endpoint
2. Approver selects their role in dashboard
3. System filters requests requiring their approval
4. Approver clicks approve/reject button
5. Request sent to `/api/approve` POST
6. API updates node and request status in SQLite database
7. Dashboard refreshes to show updated status

### Status Propagation
- **Node Level**: Individual approval node status
- **Request Level**: Overall request status (derived from all nodes)
- **UI Updates**: Immediate refresh after approval actions

## Development Commands

### Available Scripts
```bash
npm install      # Install dependencies including better-sqlite3
npm run dev      # Start development server (localhost:3000)
npm run build    # Build production application
npm run start    # Start production server
npm run lint     # Run ESLint for code quality
```

**Database Notes:**
- Database auto-creates on first API call
- Pre-populated with default approver users
- Data persists during development session
- Resets on server restart or Vercel deployment

### Development Setup
1. Node.js environment with npm
2. SQLite database with better-sqlite3
3. TypeScript support configured
4. Tailwind CSS for styling
5. ESLint for code quality
6. Next.js development server with hot reload
7. Automatic database initialization on first run

## Configuration Files

### `next.config.ts`
- Minimal Next.js configuration
- No custom webpack or API modifications

### `tsconfig.json`
- TypeScript configuration with strict mode
- Path mapping: `@/*` → `./src/*`
- Next.js plugin integration

### `tailwind.config` & `postcss.config.mjs`
- Tailwind CSS v4 configuration
- PostCSS integration for CSS processing

## Key Implementation Notes

### SQLite Database Layer
- Database initialization in `/src/lib/db.ts`
- Automatic schema creation with foreign key constraints
- Pre-populated with default users (Jane Smith, Bob Johnson, Alice Brown)
- Functions in `/src/lib/data.ts` act as data access layer
- Transaction support for data consistency
- Database file: `approval-demo.db` (local) or `/tmp/approval-demo.db` (production)

### Hardcoded Workflow
- Approval hierarchy is fixed in code
- New requests automatically get predefined approvers
- No dynamic workflow configuration
- Suitable for demonstration purposes

### Client-Side State Management
- React useState for form data and UI state
- useEffect for data fetching
- No external state management library
- Simple async/await for API calls

## Extensibility Points

### Adding New Approval Levels
1. Modify the approvalNodes creation in `/api/requests/route.ts`
2. Add new users with appropriate roles in `/lib/data.ts`
3. Update UI to handle additional levels

### Dynamic Workflow Configuration
1. Create workflow templates in data layer
2. Modify request creation to use templates
3. Add workflow builder UI

### Database Schema Extensions
1. Add new tables for additional entities
2. Modify database initialization in `/src/lib/db.ts`
3. Update API routes for new database operations
4. Consider data migration scripts for schema changes

### Alternative Database Solutions
1. **PostgreSQL**: For production with persistent storage
2. **Turso**: For distributed SQLite with persistence
3. **Vercel KV**: For simple key-value storage needs
4. **Supabase**: For full-featured database with real-time features

This architecture provides a solid foundation for understanding and extending the approval system workflow.