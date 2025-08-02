import { NextRequest, NextResponse } from 'next/server';
import { getApprovalRequests, addApprovalRequest } from '@/lib/data';
import { ApprovalRequest } from '@/types/approval';

export async function GET() {
  return NextResponse.json(getApprovalRequests());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeName, requestType, startDate, endDate, reason } = body;

    const newRequest: Omit<ApprovalRequest, 'id' | 'createdAt'> = {
      employeeId: '1',
      employeeName,
      requestType,
      startDate,
      endDate,
      reason,
      status: 'pending',
      approvalNodes: []
    };

    const createdRequest = addApprovalRequest(newRequest);
    return NextResponse.json(createdRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating request:', error);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}