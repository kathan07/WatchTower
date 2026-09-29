export interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    validity: number;
    popular?: boolean;
}
