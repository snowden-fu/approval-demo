import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Approval System Demo
          </h1>
          <p className="text-lg text-gray-600">
            Simple workflow for sick leave approval with multi-level approvers
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Submit Request
            </h2>
            <p className="text-gray-600 mb-6">
              Create a new sick leave request that will go through the approval workflow
            </p>
            <Link 
              href="/request"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block"
            >
              New Request
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Approval Dashboard
            </h2>
            <p className="text-gray-600 mb-6">
              View and approve pending requests assigned to you
            </p>
            <Link 
              href="/dashboard"
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors inline-block"
            >
              View Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">How it works:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Employee submits a sick leave request</li>
            <li>Request goes to Team Lead level (Jane Smith OR Bob Johnson can approve)</li>
            <li>After team lead approval, request goes to HR Manager (Alice Brown)</li>
            <li>Once all levels approve, the request is fully approved</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
