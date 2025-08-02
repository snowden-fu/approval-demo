export interface User {
  id: string;
  name: string;
  role: string;
}

export interface ApprovalRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  requestType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvalNodes: ApprovalNode[];
}

export interface ApprovalNode {
  id: string;
  level: number;
  approvers: User[];
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: User;
  approvedAt?: string;
  rejectedBy?: User;
  rejectedAt?: string;
  requiresAll: boolean; // false means OR logic (any one can approve)
}