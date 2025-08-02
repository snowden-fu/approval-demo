import { User, ApprovalRequest } from '@/types/approval';
import { approvalDB } from './db';

export function getUsers(): User[] {
  return approvalDB.getUsers();
}

export function getUserById(id: string): User | undefined {
  return approvalDB.getUserById(id);
}

export function getApprovalRequests(): ApprovalRequest[] {
  return approvalDB.getApprovalRequests();
}

export function addApprovalRequest(request: Omit<ApprovalRequest, 'id' | 'createdAt'>) {
  const newRequest: ApprovalRequest = {
    ...request,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  };
  
  // Add default approval workflow
  newRequest.approvalNodes = [
    {
      id: `node-${newRequest.id}-1`,
      level: 1,
      approvers: [
        { id: '1', name: 'Jane Smith', role: 'Team Lead' },
        { id: '2', name: 'Bob Johnson', role: 'Team Lead' }
      ],
      status: 'pending',
      requiresAll: false
    },
    {
      id: `node-${newRequest.id}-2`,
      level: 2,
      approvers: [
        { id: '3', name: 'Alice Brown', role: 'HR Manager' }
      ],
      status: 'pending',
      requiresAll: true
    }
  ];

  approvalDB.addApprovalRequest(newRequest);
  return newRequest;
}

export function updateApprovalRequest(id: string, updates: Partial<ApprovalRequest>) {
  const existingRequest = approvalDB.getApprovalRequestById(id);
  if (existingRequest) {
    const updatedRequest = { ...existingRequest, ...updates };
    approvalDB.updateApprovalRequest(updatedRequest);
    return updatedRequest;
  }
  return null;
}

export function getApprovalRequestById(id: string): ApprovalRequest | undefined {
  return approvalDB.getApprovalRequestById(id);
}