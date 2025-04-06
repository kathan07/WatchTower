import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useUser } from '../contexts/userContext';

interface SessionData {
  id: string;
  payment_status: string;
  amount_total: number;
  customer_details: {
    email: string;
    name: string;
  };
  metadata: {
    planName: string;
    validity: string;
  };
}

const Success: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user, updateUser } = useUser();
  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const queryParams = new URLSearchParams(location.search);
        const sessionId = queryParams.get('session_id');

        if (!sessionId) {
          setLoading(false);
          return;
        }

        const response = await axios.get(`/api/subscribe/session/${sessionId}`);

        if (response.data.success) {
          const sessionData = response.data.session;
          setSession(sessionData);
          updateUser({
            ...user!,
            subscriptionStatus: true,
            subscriptionType: sessionData.metadata.planName,
          });
        } else {
          setError('Payment verification failed.');
        }
      } catch (err) {
        console.error('Error verifying payment:', err);
        setError('Something went wrong while verifying your payment.');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [location, updateUser, user]); 


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg text-gray-700">Verifying your payment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-red-500 text-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-center mb-4">Payment Verification Failed</h1>
          <p className="text-center text-gray-600 mb-6">{error}</p>
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/plans')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Plans
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-4">No Session Found</h1>
          <p className="text-center text-gray-600 mb-6">Unable to find payment information.</p>
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/plans')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Plans
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formattedAmount = (session.amount_total / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="text-green-500 text-center mb-4">
          <CheckCircle className="h-16 w-16 mx-auto" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-4">Payment Successful!</h1>
        <div className="border-t border-b border-gray-200 py-4 my-4">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Plan:</span>
            <span className="font-medium">{session.metadata.planName}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Amount:</span>
            <span className="font-medium">{formattedAmount}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Duration:</span>
            <span className="font-medium">{session.metadata.validity} months</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-medium">{session.customer_details.email}</span>
          </div>
        </div>
        <p className="text-center text-gray-600 mb-6">
          Thank you for your subscription! Your account has been upgraded successfully.
        </p>
        <div className="flex justify-center">
          <button
            onClick={() => navigate('/plans')}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Success;