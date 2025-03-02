import { Outlet, Navigate } from 'react-router-dom';
import { useUser } from '../contexts/userContext';
import { BarLoader } from 'react-spinners';

const PrivateRoute: React.FC = () => {
    const { user, isLoading } = useUser();

    if (isLoading) {
        return <BarLoader color = "#0aa4cc" height = { 10 } loading width = { 400 }/>
    }

    if (!user) {
        return <Navigate to="/signin" replace/>;
    }
    return <Outlet />;
};

export default PrivateRoute;