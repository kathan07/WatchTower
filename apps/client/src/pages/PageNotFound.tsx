import { FC } from 'react'
import { Link } from 'react-router-dom';

const PageNotFound: FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-white">
            <div className="flex items-center mb-8">
                {/* Browser window icon */}
                <div className="relative mr-4">
                    <div className="w-30 h-30 bg-blue-50 border border-blue-200 rounded flex items-center justify-center">
                        {/* Browser bar */}
                        <div className="absolute top-0 left-0 right-0 h-3 bg-blue-100 rounded-t flex items-center px-1">
                            <div className="flex space-x-1">
                                <div className="w-1 h-1 bg-blue-300 rounded-full"></div>
                                <div className="w-1 h-1 bg-blue-300 rounded-full"></div>
                                <div className="w-1 h-1 bg-blue-300 rounded-full"></div>
                            </div>
                        </div>
                        {/* Sad face */}
                        <div className="mt-2 flex flex-col items-center">
                            <div className="flex justify-center space-x-3">
                                <div className="w-1 h-1 bg-gray-700 rounded-full"></div>
                                <div className="w-1 h-1 bg-gray-700 rounded-full"></div>
                            </div>
                            <div className="w-4 h-4 mt-2 flex items-center justify-center">
                                <div className="w-2 h-2 bg-pink-300 rounded-full"></div>
                            </div>
                            <div className="w-3 h-1 bg-gray-400 mt-1 rounded-full"></div>
                        </div>
                    </div>
                    {/* Sparkle effect */}
                    <div className="absolute -top-2 -left-2 text-blue-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1z" />
                            <path d="M15 8a1 1 0 01-1-1V6h-1a1 1 0 010-2h1V3a1 1 0 112 0v1h1a1 1 0 010 2h-1v1a1 1 0 01-1 1z" />
                        </svg>
                    </div>
                </div>

                {/* 404 Speech bubble */}
                <div className="w-24 h-24 bg-blue-400 rounded-full flex items-center justify-center text-white text-5xl font-bold shadow-md">
                    404
                </div>
            </div>

            {/* Main heading */}
            <h1 className="text-blue-400 text-6xl font-light mb-8 tracking-wide">
                PAGE NOT FOUND
            </h1>

            {/* Description text */}
            <div className="text-gray-600 space-y-2 mb-8 max-w-md">
                <p className="text-lg">
                    We looked everywhere for this page.
                </p>
                <p className="text-lg">
                    Are you sure the website URL is correct?
                </p>
                <p className="text-lg">
                    Get in touch with the site owner.
                </p>
            </div>

            {/* Go back button */}
            <Link
                to="/Signin"
                className="px-8 py-3 border border-blue-300 text-blue-400 rounded-full hover:bg-blue-50 transition-colors duration-300 font-medium"
            >
                Go Back to Signin
            </Link>
        </div>
    )
}

export default PageNotFound;