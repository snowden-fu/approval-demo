import Database from 'better-sqlite3';
import { User, ApprovalRequest, ApprovalNode } from '@/types/approval';
import path from 'path';

// Database row interfaces
interface ApprovalRequestRow {
  id: string;
  employee_id: string;
  employee_name: string;
  request_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  created_at: string;
}

interface ApprovalNodeRow {
  id: string;
  request_id: string;
  level: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_by_id?: string;
  approved_by_name?: string;
  approved_by_role?: string;
  approved_at?: string;
  rejected_by_id?: string;
  rejected_by_name?: string;
  rejected_by_role?: string;
  rejected_at?: string;
  requires_all: number;
}

// Initialize database
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/approval-demo.db' 
  : path.join(process.cwd(), 'approval-demo.db');

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL
    )
  `);

  // Approval requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS approval_requests (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      request_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at TEXT NOT NULL
    )
  `);

  // Approval nodes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS approval_nodes (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
      approved_by_id TEXT,
      approved_by_name TEXT,
      approved_by_role TEXT,
      approved_at TEXT,
      rejected_by_id TEXT,
      rejected_by_name TEXT,
      rejected_by_role TEXT,
      rejected_at TEXT,
      requires_all BOOLEAN NOT NULL,
      FOREIGN KEY (request_id) REFERENCES approval_requests (id) ON DELETE CASCADE
    )
  `);

  // Node approvers junction table
  db.exec(`
    CREATE TABLE IF NOT EXISTS node_approvers (
      node_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      PRIMARY KEY (node_id, user_id),
      FOREIGN KEY (node_id) REFERENCES approval_nodes (id) ON DELETE CASCADE
    )
  `);

  // Insert default users if they don't exist
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, name, role) VALUES (?, ?, ?)
  `);

  const defaultUsers = [
    { id: '1', name: 'Jane Smith', role: 'Team Lead' },
    { id: '2', name: 'Bob Johnson', role: 'Team Lead' },
    { id: '3', name: 'Alice Brown', role: 'HR Manager' }
  ];

  defaultUsers.forEach(user => {
    insertUser.run(user.id, user.name, user.role);
  });
}

// Database operations
export class ApprovalDB {
  constructor() {
    initializeDatabase();
  }

  // Get all users
  getUsers(): User[] {
    const stmt = db.prepare('SELECT * FROM users');
    return stmt.all() as User[];
  }

  // Get user by id
  getUserById(id: string): User | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | undefined;
  }

  // Get all approval requests
  getApprovalRequests(): ApprovalRequest[] {
    const requestsStmt = db.prepare('SELECT * FROM approval_requests ORDER BY created_at DESC');
    const requests = requestsStmt.all() as ApprovalRequestRow[];

    return requests.map(request => {
      const approvalNodes = this.getApprovalNodesByRequestId(request.id);
      return {
        id: request.id,
        employeeId: request.employee_id,
        employeeName: request.employee_name,
        requestType: request.request_type,
        startDate: request.start_date,
        endDate: request.end_date,
        reason: request.reason,
        status: request.status,
        createdAt: request.created_at,
        approvalNodes
      } as ApprovalRequest;
    });
  }

  // Get approval nodes for a request
  private getApprovalNodesByRequestId(requestId: string): ApprovalNode[] {
    const nodesStmt = db.prepare(`
      SELECT * FROM approval_nodes 
      WHERE request_id = ? 
      ORDER BY level
    `);
    const nodes = nodesStmt.all(requestId) as ApprovalNodeRow[];

    return nodes.map(node => {
      // Get approvers for this node
      const approversStmt = db.prepare(`
        SELECT user_id as id, user_name as name, user_role as role
        FROM node_approvers 
        WHERE node_id = ?
      `);
      const approvers = approversStmt.all(node.id) as User[];

      const approvalNode: ApprovalNode = {
        id: node.id,
        level: node.level,
        approvers,
        status: node.status,
        requiresAll: Boolean(node.requires_all)
      };

      if (node.approved_by_id) {
        approvalNode.approvedBy = {
          id: node.approved_by_id,
          name: node.approved_by_name!,
          role: node.approved_by_role!
        };
        approvalNode.approvedAt = node.approved_at!;
      }

      if (node.rejected_by_id) {
        approvalNode.rejectedBy = {
          id: node.rejected_by_id,
          name: node.rejected_by_name!,
          role: node.rejected_by_role!
        };
        approvalNode.rejectedAt = node.rejected_at!;
      }

      return approvalNode;
    });
  }

  // Add new approval request
  addApprovalRequest(request: ApprovalRequest): void {
    const insertRequest = db.prepare(`
      INSERT INTO approval_requests 
      (id, employee_id, employee_name, request_type, start_date, end_date, reason, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertNode = db.prepare(`
      INSERT INTO approval_nodes 
      (id, request_id, level, status, requires_all)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertApprover = db.prepare(`
      INSERT INTO node_approvers 
      (node_id, user_id, user_name, user_role)
      VALUES (?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      // Insert the main request
      insertRequest.run(
        request.id,
        request.employeeId,
        request.employeeName,
        request.requestType,
        request.startDate,
        request.endDate,
        request.reason,
        request.status,
        request.createdAt
      );

      // Insert approval nodes and their approvers
      request.approvalNodes.forEach(node => {
        insertNode.run(
          node.id,
          request.id,
          node.level,
          node.status,
          node.requiresAll ? 1 : 0
        );

        node.approvers.forEach(approver => {
          insertApprover.run(
            node.id,
            approver.id,
            approver.name,
            approver.role
          );
        });
      });
    });

    transaction();
  }

  // Update approval request
  updateApprovalRequest(updatedRequest: ApprovalRequest): void {
    const updateRequest = db.prepare(`
      UPDATE approval_requests 
      SET status = ?
      WHERE id = ?
    `);

    const updateNode = db.prepare(`
      UPDATE approval_nodes 
      SET status = ?, 
          approved_by_id = ?, approved_by_name = ?, approved_by_role = ?, approved_at = ?,
          rejected_by_id = ?, rejected_by_name = ?, rejected_by_role = ?, rejected_at = ?
      WHERE id = ?
    `);

    const transaction = db.transaction(() => {
      // Update main request status
      updateRequest.run(updatedRequest.status, updatedRequest.id);

      // Update approval nodes
      updatedRequest.approvalNodes.forEach(node => {
        updateNode.run(
          node.status,
          node.approvedBy?.id || null,
          node.approvedBy?.name || null,
          node.approvedBy?.role || null,
          node.approvedAt || null,
          node.rejectedBy?.id || null,
          node.rejectedBy?.name || null,
          node.rejectedBy?.role || null,
          node.rejectedAt || null,
          node.id
        );
      });
    });

    transaction();
  }

  // Get request by ID
  getApprovalRequestById(id: string): ApprovalRequest | undefined {
    const requests = this.getApprovalRequests();
    return requests.find(request => request.id === id);
  }
}

// Export singleton instance
export const approvalDB = new ApprovalDB();