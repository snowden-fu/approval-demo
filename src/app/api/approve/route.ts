import { NextRequest, NextResponse } from 'next/server';
import { getApprovalRequestById, updateApprovalRequest } from '@/lib/data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, nodeId, approverId, action } = body;

    const req = getApprovalRequestById(requestId);
    if (!req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const nodeIndex = req.approvalNodes.findIndex(node => node.id === nodeId);
    if (nodeIndex === -1) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const node = req.approvalNodes[nodeIndex];
    const approver = node.approvers.find(a => a.id === approverId);
    if (!approver) {
      return NextResponse.json({ error: 'Approver not found' }, { status: 404 });
    }

    if (action === 'approve') {
      node.status = 'approved';
      node.approvedBy = approver;
      node.approvedAt = new Date().toISOString();
    } else if (action === 'reject') {
      node.status = 'rejected';
      node.rejectedBy = approver;
      node.rejectedAt = new Date().toISOString();
      req.status = 'rejected';
    }

    const allPreviousNodesApproved = req.approvalNodes
      .slice(0, nodeIndex + 1)
      .every(n => n.status === 'approved');

    if (allPreviousNodesApproved && action === 'approve') {
      const allNodesApproved = req.approvalNodes.every(n => n.status === 'approved');
      if (allNodesApproved) {
        req.status = 'approved';
      }
    }

    const updatedRequest = updateApprovalRequest(requestId, req);
    return NextResponse.json(updatedRequest);
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 });
  }
}