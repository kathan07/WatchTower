import React from 'react';
import PriceCard from '../components/PriceCard';
import Navbar from '../components/Navbar';
import { useUser } from '../contexts/user-context';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';
import { SUBSCRIPTION_PLANS, subscribeApi } from '@repo/shared';

const Plans: React.FC = () => {
    const { user } = useUser();

    const handleSubscribe = async (planId: string): Promise<void> => {
        const stripe = await loadStripe('pk_test_51R7yMnC0RHxlNzZ115KU9T2NE2dU12j2laxS2QzyGTmM2THwNlSUas9JhgrJVg7ACuROYdVTIfA0iv6AwE5n8jB600OOlpRdcy');
        
        if (!stripe) {
            throw new Error('Failed to load Stripe');
        }

        const purchasedPlan = SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
        if (!purchasedPlan) {
            throw new Error('Plan not found');
        }

        try {
            const response = await axios.post(subscribeApi.checkout(), purchasedPlan);
            const result = await stripe.redirectToCheckout({
                sessionId: response.data.session.id
            });

            if (result.error) {
                throw new Error(result.error.message);
            }
        } catch (error) {
            console.error("Error with Stripe checkout:", error);
        }
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
                            {SUBSCRIPTION_PLANS.map((plan) => (
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
                                plan={SUBSCRIPTION_PLANS.find((plan) => plan.id === user!.subscriptionType!.toLowerCase()) || SUBSCRIPTION_PLANS[0]}
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
