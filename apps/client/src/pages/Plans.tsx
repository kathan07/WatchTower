import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PriceCard from '../components/PriceCard';
import Navbar from '../components/Navbar';
import { useUser } from '../contexts/userContext';

export interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    validity: number; // in months
    popular?: boolean;
}

const Plans: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useUser();
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

    const plans: SubscriptionPlan[] = [
        {
            id: 'basic',
            name: 'BASIC',
            price: 15.99,
            validity: 3
        },
        {
            id: 'premium',
            name: 'PREMIUM',
            price: 25.99,
            validity: 6,
            popular: true
        },
        {
            id: 'enterprise',
            name: 'ENTERPRISE',
            price: 45.99,
            validity: 12
        }
    ];

    const handleSubscribe = (planId: string) => {
        setSelectedPlan(planId);
        // In a real app, you would process the payment here
        // For now, just redirect to the websites page
        navigate('/websites');
    };

    return (
        <>
            <Navbar />
            <section className="text-gray-700 body-font overflow-hidden border-t border-gray-200">
                <div className="container px-5 py-24 mx-auto flex flex-wrap">
                    <div className="lg:w-1/4 mt-48 hidden lg:block">
                        <div className="mt-px border-t border-gray-300 border-b border-l rounded-tl-lg rounded-bl-lg overflow-hidden">
                            <p className="bg-gray-100 text-gray-900 h-12 text-center px-4 flex items-center justify-start -mt-px">Monitor 10 websites</p>
                            <p className="text-gray-900 h-12 text-center px-4 flex items-center justify-start">Daily analytics</p>
                            <p className="bg-gray-100 text-gray-900 h-12 text-center px-4 flex items-center justify-start">Monthly analytics</p>
                            <p className="text-gray-900 h-12 text-center px-4 flex items-center justify-start">Yearly analytics</p>
                            <p className="bg-gray-100 text-gray-900 h-12 text-center px-4 flex items-center justify-start">Email alerts</p>
                            <p className="text-gray-900 h-12 text-center px-4 flex items-center justify-start">Validity period</p>
                        </div>
                    </div>
                    {user!.subscriptionStatus === false ? (
                        <div className="flex lg:w-3/4 w-full flex-wrap lg:border border-gray-300 rounded-lg">
                            {plans.map((plan) => (
                                <PriceCard
                                    key={plan.id}
                                    plan={plan}
                                    onSubscribe={handleSubscribe}
                                    subscriptionStatus={user!.subscriptionStatus}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex lg:w-1/3 w-full justify-center lg:border border-gray-300 rounded-lg">
                            <PriceCard
                                key={user!.subscriptionType!.toLowerCase()}
                                plan={plans.find((plan) => plan.id === user!.subscriptionType!.toLowerCase()) || plans[0]}
                                onSubscribe={() => { }}
                                subscriptionStatus={user!.subscriptionStatus}
                            />
                        </div>
                    )}
                </div>
            </section>
        </>
    );
};

export default Plans;