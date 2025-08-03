'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ApprovalRequest, User } from '@/types/approval';

export default function DashboardPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [requestsResponse, usersResponse] = await Promise.all([
        fetch('/api/requests'),
        fetch('/api/users')
      ]);
      
      const requestsData = await requestsResponse.json();
      const usersData = await usersResponse.json();
      
      setRequests(requestsData);
      setUsers(usersData);
      
      // Set default user to Jane Smith (Team Lead)
      const defaultUser = usersData.find((u: User) => u.name === 'Jane Smith') || usersData.find((u: User) => u.role !== 'Employee') || usersData[0];
      setSelectedUser(defaultUser);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/requests');
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  };

  const handleApproval = async (requestId: string, nodeId: string, action: 'approve' | 'reject') => {
    if (!selectedUser) return;
    
    const nodeKey = `${requestId}-${nodeId}`;
    setProcessingIds(prev => new Set(prev).add(nodeKey));
    
    // Show immediate feedback
    alert(`${action === 'approve' ? 'Approving' : 'Rejecting'} request...`);
    
    try {
      const response = await fetch('/api/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          nodeId,
          approverId: selectedUser.id,
          action
        }),
      });

      if (response.ok) {
        // Show success immediately
        alert(`Request ${action}d successfully!`);
        // Then refresh data
        fetchRequests();
      } else {
        alert(`Failed to ${action} request`);
      }
    } catch (error) {
      alert(`Error: ${error}`);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodeKey);
        return newSet;
      });
    }
  };

  const getRequestsForUser = () => {
    if (!selectedUser) return [];
    
    return requests.filter(request => {
      return request.approvalNodes.some(node => 
        node.status === 'pending' && 
        node.approvers.some(approver => approver.id === selectedUser.id) &&
        // Check if all previous nodes are approved
        request.approvalNodes.slice(0, request.approvalNodes.indexOf(node))
          .every(prevNode => prevNode.status === 'approved')
      );
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  if (loading || !selectedUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const userRequests = getRequestsForUser();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">
            Approval Dashboard
          </h1>
        </div>

        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <label htmlFor="userSelect" className="block text-sm font-medium text-gray-700 mb-2">
            Select User (Approver):
          </label>
          <select
            id="userSelect"
            value={selectedUser.id}
            onChange={(e) => setSelectedUser(users.find(u => u.id === e.target.value) || users[0])}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {users.filter(u => u.role !== 'Employee').map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Pending Requests for {selectedUser.name}
          </h2>

          {userRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500">No pending requests for approval</p>
            </div>
          ) : (
            userRequests.map(request => {
              const currentNode = request.approvalNodes.find(node => 
                node.status === 'pending' && 
                node.approvers.some(approver => approver.id === selectedUser.id)
              );

              return (
                <div key={request.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800">
                        {request.requestType} - {request.employeeName}
                      </h3>
                      <p className="text-gray-600">
                        {request.startDate} to {request.endDate}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">Reason:</h4>
                    <p className="text-gray-600">{request.reason}</p>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">Approval Workflow:</h4>
                    <div className="space-y-2">
                      {request.approvalNodes.map((node, _index) => (
                        <div key={node.id} className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Level {node.level}:</span>
                          <div className="flex items-center space-x-2">
                            {node.approvers.map((approver, approverIndex) => (
                              <span key={approver.id}>
                                <span className="text-sm text-gray-700">{approver.name}</span>
                                {approverIndex < node.approvers.length - 1 && !node.requiresAll && (
                                  <span className="text-sm text-gray-500 mx-1">OR</span>
                                )}
                                {approverIndex < node.approvers.length - 1 && node.requiresAll && (
                                  <span className="text-sm text-gray-500 mx-1">AND</span>
                                )}
                              </span>
                            ))}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(node.status)}`}>
                            {node.status}
                          </span>
                          {node.approvedBy && (
                            <span className="text-xs text-gray-500">
                              by {node.approvedBy.name}
                            </span>
                          )}
                          {node.rejectedBy && (
                            <span className="text-xs text-gray-500">
                              by {node.rejectedBy.name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {currentNode && (
                    <div className="flex gap-4 pt-4 border-t">
                      <button
                        onClick={() => handleApproval(request.id, currentNode.id, 'approve')}
                        disabled={processingIds.has(`${request.id}-${currentNode.id}`)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingIds.has(`${request.id}-${currentNode.id}`) ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleApproval(request.id, currentNode.id, 'reject')}
                        disabled={processingIds.has(`${request.id}-${currentNode.id}`)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingIds.has(`${request.id}-${currentNode.id}`) ? 'Processing...' : 'Reject'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">All Requests Status</h3>
          <div className="space-y-4">
            {requests.map(request => (
              <div key={request.id} className="border-l-4 border-blue-200 pl-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{request.employeeName} - {request.requestType}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {request.startDate} to {request.endDate}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}