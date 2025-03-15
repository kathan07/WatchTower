import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const Home: React.FC = () => {
    interface Website {
        id: string;
        url: string;
    }

    const [websites, setWebsites] = useState<Website[]>([]);
    const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
    const [isAddingWebsite, setIsAddingWebsite] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // In a real app, you would fetch from your API
        // For now, use mock data
        const mockWebsites: Website[] = [
            {
                id: '1',
                url: 'https://example.com',
            },
            {
                id: '2',
                url: 'https://test.com',
            }
        ];
        setWebsites(mockWebsites);
    }, []);

    const handleAddWebsite = () => {
        if (!newWebsiteUrl) {
            setError('Please enter both URL and name');
            return;
        }

        // Validate URL
        try {
            new URL(newWebsiteUrl);
        } catch (e) {
            setError('Please enter a valid URL');
            return;
        }

        // In a real app, you would call your API here
        const newWebsite: Website = {
            id: Date.now().toString(),
            url: newWebsiteUrl,
        };

        setWebsites([...websites, newWebsite]);
        setNewWebsiteUrl('');
        setIsAddingWebsite(false);
        setError('');
    };

    const handleRemoveWebsite = (id: string) => {
        // In a real app, you would call your API here
        setWebsites(websites.filter(website => website.id !== id));
    };

    return (
        <>
            <Navbar />
            <div className="max-w-6xl mx-auto mt-20">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Your Websites</h1>
                    <button
                        onClick={() => setIsAddingWebsite(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
                    >
                        Add Website
                    </button>
                </div>

                {isAddingWebsite && (
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-xl font-bold mb-4">Add New Website</h2>

                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                {error}
                            </div>
                        )}

                        <div className='mb-4'>
                            <label htmlFor="websiteUrl" className="block text-gray-700 font-medium mb-2">
                                Website URL
                            </label>
                            <input
                                type="url"
                                id="websiteUrl"
                                value={newWebsiteUrl}
                                onChange={(e) => setNewWebsiteUrl(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://example.com"
                                required
                            />
                        </div>


                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setIsAddingWebsite(false);
                                    setError('');
                                }}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddWebsite}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
                            >
                                Add Website
                            </button>
                        </div>
                    </div>
                )}

                {websites.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <h2 className="text-xl font-medium text-gray-700 mb-2">No websites added yet</h2>
                        <p className="text-gray-500 mb-4">Add your first website to start monitoring</p>
                        <button
                            onClick={() => setIsAddingWebsite(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
                        >
                            Add Website
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Website
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {websites.map((website) => (
                                    <tr key={website.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{website.url}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link
                                                to={`/analytics/${website.id}`}
                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                            >
                                                Analytics
                                            </Link>
                                            <button
                                                onClick={() => handleRemoveWebsite(website.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    )
};

export default Home;





