import { User, ApprovalRequest, ApprovalNode } from '@/types/approval';
import { supabase } from './supabase';

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*');
  
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  
  return data || [];
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  
  return data;
}

export async function getApprovalRequests(): Promise<ApprovalRequest[]> {
  const { data: requests, error } = await supabase
    .from('approval_requests')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching approval requests:', error);
    return [];
  }
  
  if (!requests) return [];
  
  // Fetch approval nodes for each request
  const requestsWithNodes = await Promise.all(
    requests.map(async (request) => {
      const approvalNodes = await getApprovalNodesByRequestId(request.id);
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
    })
  );
  
  return requestsWithNodes;
}

async function getApprovalNodesByRequestId(requestId: string): Promise<ApprovalNode[]> {
  const { data: nodes, error } = await supabase
    .from('approval_nodes')
    .select('*')
    .eq('request_id', requestId)
    .order('level');
  
  if (error) {
    console.error('Error fetching approval nodes:', error);
    return [];
  }
  
  if (!nodes) return [];
  
  // Fetch approvers for each node
  const nodesWithApprovers = await Promise.all(
    nodes.map(async (node) => {
      const { data: approvers, error: approversError } = await supabase
        .from('node_approvers')
        .select('user_id, user_name, user_role')
        .eq('node_id', node.id);
      
      if (approversError) {
        console.error('Error fetching node approvers:', approversError);
        return null;
      }
      
      const approvalNode: ApprovalNode = {
        id: node.id,
        level: node.level,
        approvers: (approvers || []).map(approver => ({
          id: approver.user_id,
          name: approver.user_name,
          role: approver.user_role
        })),
        status: node.status,
        requiresAll: node.requires_all
      };
      
      if (node.approved_by_id) {
        approvalNode.approvedBy = {
          id: node.approved_by_id,
          name: node.approved_by_name,
          role: node.approved_by_role
        };
        approvalNode.approvedAt = node.approved_at;
      }
      
      if (node.rejected_by_id) {
        approvalNode.rejectedBy = {
          id: node.rejected_by_id,
          name: node.rejected_by_name,
          role: node.rejected_by_role
        };
        approvalNode.rejectedAt = node.rejected_at;
      }
      
      return approvalNode;
    })
  );
  
  return nodesWithApprovers.filter(node => node !== null) as ApprovalNode[];
}

export async function addApprovalRequest(request: Omit<ApprovalRequest, 'id' | 'createdAt'>): Promise<ApprovalRequest | null> {
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

  // Start transaction
  const { error: requestError } = await supabase
    .from('approval_requests')
    .insert({
      id: newRequest.id,
      employee_id: newRequest.employeeId,
      employee_name: newRequest.employeeName,
      request_type: newRequest.requestType,
      start_date: newRequest.startDate,
      end_date: newRequest.endDate,
      reason: newRequest.reason,
      status: newRequest.status,
      created_at: newRequest.createdAt
    });
  
  if (requestError) {
    console.error('Error inserting approval request:', requestError);
    return null;
  }
  
  // Insert approval nodes
  for (const node of newRequest.approvalNodes) {
    const { error: nodeError } = await supabase
      .from('approval_nodes')
      .insert({
        id: node.id,
        request_id: newRequest.id,
        level: node.level,
        status: node.status,
        requires_all: node.requiresAll
      });
    
    if (nodeError) {
      console.error('Error inserting approval node:', nodeError);
      return null;
    }
    
    // Insert node approvers
    for (const approver of node.approvers) {
      const { error: approverError } = await supabase
        .from('node_approvers')
        .insert({
          node_id: node.id,
          user_id: approver.id,
          user_name: approver.name,
          user_role: approver.role
        });
      
      if (approverError) {
        console.error('Error inserting node approver:', approverError);
        return null;
      }
    }
  }
  
  return newRequest;
}

export async function updateApprovalRequest(id: string, updates: Partial<ApprovalRequest>): Promise<ApprovalRequest | null> {
  const existingRequest = await getApprovalRequestById(id);
  if (!existingRequest) return null;
  
  const updatedRequest = { ...existingRequest, ...updates };
  
  // Update main request
  const { error: requestError } = await supabase
    .from('approval_requests')
    .update({ status: updatedRequest.status })
    .eq('id', id);
  
  if (requestError) {
    console.error('Error updating approval request:', requestError);
    return null;
  }
  
  // Update approval nodes
  for (const node of updatedRequest.approvalNodes) {
    const { error: nodeError } = await supabase
      .from('approval_nodes')
      .update({
        status: node.status,
        approved_by_id: node.approvedBy?.id || null,
        approved_by_name: node.approvedBy?.name || null,
        approved_by_role: node.approvedBy?.role || null,
        approved_at: node.approvedAt || null,
        rejected_by_id: node.rejectedBy?.id || null,
        rejected_by_name: node.rejectedBy?.name || null,
        rejected_by_role: node.rejectedBy?.role || null,
        rejected_at: node.rejectedAt || null
      })
      .eq('id', node.id);
    
    if (nodeError) {
      console.error('Error updating approval node:', nodeError);
      return null;
    }
  }
  
  return updatedRequest;
}

export async function getApprovalRequestById(id: string): Promise<ApprovalRequest | null> {
  const { data: request, error } = await supabase
    .from('approval_requests')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching approval request:', error);
    return null;
  }
  
  if (!request) return null;
  
  const approvalNodes = await getApprovalNodesByRequestId(request.id);
  
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
}