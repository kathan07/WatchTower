import { useUser } from "../contexts/userContext";
import { Link } from "react-router-dom";
import React from "react";

const Navbar: React.FC = () => {
    const { clearUser, user } = useUser();
    const handleLogout = () => {
        clearUser();
    };
    return (
        <nav className="bg-white shadow-md">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center py-4">
                    <Link to="/" className="text-xl font-bold text-blue-600">WatchTower</Link>

                    <div className="flex items-center space-x-6">
                        {user!.subscriptionStatus && 
                        <Link to="/" className="text-gray-700 hover:text-blue-600">
                            Websites
                        </Link>}
                        <Link to="/plans" className="text-gray-700 hover:text-blue-600">
                            Plans
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;