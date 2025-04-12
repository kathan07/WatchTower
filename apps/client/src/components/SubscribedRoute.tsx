import { Outlet, Navigate } from 'react-router-dom';
import { useUser } from '../contexts/userContext';

const SubscribedRoute: React.FC = () => {
    const { user } = useUser();

    if (!user?.subscriptionStatus) {
        return <Navigate to="/plans" replace/>;
    }
    return <Outlet />;
};

export default SubscribedRoute;