# Next.js Approval System Demo

A demo application showcasing a multi-level approval workflow system for employee leave requests, built with Next.js, TypeScript, Tailwind CSS, and SQLite database.

## Features

- **Multi-level approval workflow** with sequential processing
- **OR logic support** - multiple approvers at the same level, only one needs to approve
- **Real-time status tracking** with visual workflow indicators
- **User role simulation** to test different approver perspectives
- **SQLite database storage** for persistent data during sessions
- **Simple, clean UI** built with Tailwind CSS

## How to Use This Demo

### 1. Setup and Start the Application

First, install dependencies:
```bash
npm install
```

Then start the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

**Note**: The application will automatically create a SQLite database (`approval-demo.db`) on first run with pre-populated default users.

### 2. Submit a Request

1. Click **"New Request"** from the home page
2. Fill out the sick leave form:
   - Employee Name
   - Request Type (Sick Leave, Personal Leave, Vacation)
   - Start and End Dates
   - Reason for leave
3. Click **"Submit Request"**

### 3. Approve Requests (Multi-User Simulation)

1. Go to the **"Approval Dashboard"**
2. Use the **user selector dropdown** to switch between different approvers:
   - **Jane Smith (Team Lead)** - Can approve Level 1
   - **Bob Johnson (Team Lead)** - Can also approve Level 1 (OR logic)
   - **Alice Brown (HR Manager)** - Approves Level 2
3. View pending requests that require the selected user's approval
4. Click **"Approve"** or **"Reject"** for each request

**Database Persistence**: All approval actions are immediately saved to the SQLite database, so data persists between page refreshes and browser sessions (until server restart).

### 4. Understanding the Workflow

The demo implements a 2-level approval process:

**Level 1: Team Lead Approval (OR Logic)**
- Either Jane Smith OR Bob Johnson can approve
- Only one team lead approval is needed to proceed

**Level 2: HR Manager Approval**  
- Alice Brown must approve after team lead approval
- Required for final approval

**Key Behaviors:**
- Requests must be approved sequentially (Level 1 → Level 2)
- Any rejection at any level immediately rejects the entire request
- The dashboard shows only requests where the selected user can take action
- All requests and their current status are visible in the "All Requests Status" section

### 5. Testing Different Scenarios

Try these scenarios to see the workflow in action:

1. **Happy Path**: Submit request → Jane approves → Alice approves → Request fully approved
2. **Alternative Approver**: Submit request → Bob approves → Alice approves → Request fully approved  
3. **Early Rejection**: Submit request → Jane rejects → Request immediately rejected
4. **Late Rejection**: Submit request → Jane approves → Alice rejects → Request rejected

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Technical Details

### Database
- **SQLite** database with `better-sqlite3` for Node.js
- Automatic schema creation and initialization
- Pre-populated with default approver users
- Database file: `approval-demo.db` (ignored in git)
- Foreign key relationships for data integrity

### Data Persistence
- **Development**: Data persists between sessions until server restart
- **Production (Vercel)**: Database resets on each deployment (ephemeral storage)
- **Session-scoped**: Data persists during the current deployment lifecycle

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

**SQLite on Vercel:**
- Database will be created in `/tmp` directory
- Data persists during function execution but resets on deployments
- Perfect for demo applications showcasing workflows

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
