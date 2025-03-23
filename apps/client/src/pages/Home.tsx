import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import axios from 'axios';
import { toast } from 'react-toastify';
import { BarLoader } from 'react-spinners';

const Home: React.FC = () => {
    interface Website {
        id: string;
        url: string;
    }

    const [websites, setWebsites] = useState<Website[]>([]);
    const [websiteCount, setWebsiteCount] = useState<number>();
    const [newWebsiteUrl, setNewWebsiteUrl] = useState({
        url: "",
    });
    const [isAddingWebsite, setIsAddingWebsite] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState<boolean>(false);

    const getWebsites = async () => {
        try {
            setLoading(true);
            const websiteData = await axios.get('/api/dashboard/getWebsites');
            if (websiteData.data.success) {
                setWebsiteCount(websiteData.data.data.websiteCount);
                setWebsites(websiteData.data.data.websites);
            }
            else {
                throw new Error('Failed to fetch websites');
            }
        } catch (error) {
            toast.error('Failed to fetch websites');
            console.error(error);
        }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getWebsites();
    }, []);

    const handleAddWebsite = async () => {
        if (newWebsiteUrl.url.trim() === '') {
            setError('Please enter URL');
            return;
        }
        if (websiteCount === 10) {
            setError('Maximum limit of 10 websites reached');
            return;
        }
        try {
            const website = new URL(newWebsiteUrl.url);
            if (!website.protocol.startsWith('http') && !website.protocol.startsWith('https')) {
                throw new Error();
            }
        } catch (e) {
            setError('Please enter a valid URL');
            return;
        }


        try {
            const response = await axios.post("api/dashboard/addwebsite", newWebsiteUrl);
            if (!response.data.success) {
                throw new Error('Failed to add website');
            }
            setWebsites([...websites, response.data.website]);

        } catch (error) {
            console.error(error);
            toast.error('Failed to add website');
        } finally {
            setNewWebsiteUrl({ url: "" });
            setIsAddingWebsite(false);
            setError('');
        }
    };

    const handleRemoveWebsite = (id: string) => {
        const removeWebsite = async () => {
            try {
                const response = await axios.post(`/api/dashboard/removeWebsite/${id}`);
                if (!response.data.success) {
                    throw new Error('Failed to remove website');
                }
                setWebsites(websites.filter(website => website.id !== id));
                setWebsiteCount(websiteCount ? websiteCount - 1 : 0);
                toast.success('Website removed successfully');
            } catch (error) {
                console.error(error);
                toast.error('Failed to remove website');
            }
        }
        removeWebsite();
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
                        disabled={websiteCount === 10}
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
                                value={newWebsiteUrl.url}
                                onChange={(e) => setNewWebsiteUrl({ url: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://example.com"
                                required
                            />
                        </div>


                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setIsAddingWebsite(false);
                                    setNewWebsiteUrl({url:""});
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

                {loading ? (
                    <div>
                        <BarLoader color="#0aa4cc" height={10} loading width={400} />
                        <p className="text-gray-500 text-sm">Loading...</p>
                    </div>
                ) : websiteCount === 0 ? (
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





