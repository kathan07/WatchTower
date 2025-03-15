import React from 'react';

interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    validity: number; // in months
    popular?: boolean;
}

interface PriceCardProps {
    plan: SubscriptionPlan;
    onSubscribe: (planId: string) => void;
    subscriptionStatus: boolean;
}

// Checkmark component
const Checkmark: React.FC = () => (
    <span className="w-5 h-5 inline-flex items-center justify-center bg-gray-500 text-white rounded-full flex-shrink-0">
        <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" className="w-3 h-3" viewBox="0 0 24 24">
            <path d="M20 6L9 17l-5-5"></path>
        </svg>
    </span>
);

const PriceCard: React.FC<PriceCardProps> = ({ plan, onSubscribe, subscriptionStatus }) => {
    return (
        <div
            className={`${subscriptionStatus===true? 'lg:w-full': 'lg:w-1/3'} ${plan.popular ? 'lg:-mt-px' : 'lg:mt-px'} w-full mb-10 lg:mb-0 border-2 ${plan.popular ? 'border-indigo-500' : 'border-gray-300 lg:border-none'
                } rounded-lg lg:rounded-none ${plan.popular ? 'relative' : ''
                }`}
        >
            {plan.popular && (
                <span className="bg-indigo-500 text-white px-3 py-1 tracking-widest text-xs absolute right-0 top-0 rounded-bl">POPULAR</span>
            )}

            <div className="px-2 text-center h-48 flex flex-col items-center justify-center">
                <h3 className="tracking-widest">{plan.name}</h3>
                <h2 className={`text-5xl text-gray-900 font-medium ${plan.id !== 'basic' ? 'flex items-center justify-center' : ''} leading-none mb-4 mt-2`}>
                    ${plan.price}
                    {plan.id !== 'basic' && (
                        <span className="text-gray-600 text-base ml-1">/month</span>
                    )}
                </h2>
                <span className="text-sm text-gray-600">{plan.validity} month validity</span>
            </div>

            <p className="bg-gray-100 text-gray-600 h-12 text-center px-2 flex items-center -mt-px justify-center border-t border-gray-300">
                <span className="lg:hidden mr-2 font-medium">Monitor 10 websites:</span>
                <Checkmark />
            </p>

            <p className="text-gray-600 text-center h-12 flex items-center justify-center">
                <span className="lg:hidden mr-2 font-medium">Daily analytics:</span>
                <Checkmark />
            </p>

            <p className="bg-gray-100 text-gray-600 text-center h-12 flex items-center justify-center">
                <span className="lg:hidden mr-2 font-medium">Monthly analytics:</span>
                <Checkmark />
            </p>

            <p className="h-12 text-gray-600 text-center leading-relaxed flex items-center justify-center">
                <span className="lg:hidden mr-2 font-medium">Yearly analytics:</span>
                <Checkmark />
            </p>

            <p className="bg-gray-100 text-gray-600 text-center h-12 flex items-center justify-center">
                <span className="lg:hidden mr-2 font-medium">Email alerts:</span>
                <Checkmark />
            </p>

            <p className="text-gray-600 text-center h-12 flex items-center justify-center">
                <span className="lg:hidden mr-2 font-medium">Validity period:</span>
                {plan.validity} months
            </p>

            <div className={`${plan.id === 'basic' ? 'border-t border-gray-300 p-6 text-center rounded-bl-lg' : 'p-6 text-center border-t border-gray-300'}`}>
                {subscriptionStatus === false ?
                    (<button
                        onClick={() => onSubscribe(plan.id)}
                        className="flex items-center mt-auto text-white bg-indigo-500 border-0 py-2 px-4 w-full focus:outline-none hover:bg-indigo-600 rounded"
                    >
                        Subscribe
                        <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-4 h-4 ml-auto" viewBox="0 0 24 24">
                            <path d="M5 12h14M12 5l7 7-7 7"></path>
                        </svg>
                    </button>):(
                        <button
                            className="flex items-center mt-auto text-white bg-gray-300 border-0 py-2 px-4 w-full focus:outline-none rounded"
                        >
                            Subscribed
                        </button>
                    )
                }
            </div>
        </div>
    );
};

export default PriceCard;