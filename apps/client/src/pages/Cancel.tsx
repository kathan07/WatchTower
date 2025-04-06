import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

const Cancel: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="text-red-500 text-center mb-4">
          <XCircle className="h-16 w-16 mx-auto" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-4">Payment Cancelled</h1>
        <p className="text-center text-gray-600 mb-6">
          Your subscription payment was cancelled. No charges have been made to your account.
        </p>
        <div className="space-y-4">
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/plans')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cancel;