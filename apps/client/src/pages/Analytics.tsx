import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';

const Analytics = () => {
    const { websiteId } = useParams<{ websiteId: string }>();
    const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
    const [timelyAnalytics, setTimelyAnalytics] = useState<Analytics | null>(null);
    const [websiteInfo, setWebsiteInfo] = useState<{ url: string; name?: string }>({ url: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    interface DailyReport {
        date: string;
        avgResponseTime: number;
        avgUptime: number;
        avgDowntime: number;
        avgDegradedTime: number;
    }

    interface Timeframe {
        start: string;
        end: string;
    }

    interface WebsiteAnalytics {
        websiteId: string;
        url: string;
        timeframe: Timeframe;
        dailyReports: DailyReport[];
    }

    interface AnalyticsResponse {
        success: boolean;
        data: {
            monitorId: string;
            website: WebsiteAnalytics;
        };
    }

    interface Analytics {
        daily: {
            avgResponseTime: number;
            avgUptime: number;
            avgDowntime: number;
            avgDegradedTime: number;
            date: Date;
        } | null;
        monthly: {
            avgResponseTime: number;
            avgUptime: number;
            avgDowntime: number;
            avgDegradedTime: number;
            period: string;
        } | null;
        yearly: {
            avgResponseTime: number;
            avgUptime: number;
            avgDowntime: number;
            avgDegradedTime: number;
            period: string;
        } | null;
    }

    interface Reports {
        websiteId: string;
        url: string;
        name?: string;
        analytics: Analytics;
    }

    interface ReportResponse {
        success: boolean;
        data: {
            monitorId: string;
            website: Reports;
        };
    }

    const getDailyReports = async () => {
        try {
            setLoading(true);
            const response = await axios.get<AnalyticsResponse>(
                `/api/dashboard/getdailyreports/${websiteId}?timeRange=500`
            );

            if (!response.data.success) {
                throw new Error("Failed to fetch daily reports");
            }

            setDailyReports(
                response.data.data.website.dailyReports.sort((a, b) =>
                    Date.parse(b.date) - Date.parse(a.date)
                )
            );
            
            setWebsiteInfo(prev => ({
                ...prev,
                url: response.data.data.website.url
            }));
            setError('');
        } catch (error) {
            console.error('Error fetching daily reports:', error);
            setError('Failed to fetch daily reports');
            toast.error('Failed to fetch daily reports');
        }
    };

    const getReports = async () => {
        try {
            const response = await axios.get<ReportResponse>(
                `/api/dashboard/getanalytics/${websiteId}`
            );

            if (!response.data.success) {
                throw new Error("Failed to fetch analytics");
            }

            setTimelyAnalytics(response.data.data.website.analytics);
            setWebsiteInfo({
                url: response.data.data.website.url,
                name: response.data.data.website.name
            });
        } catch (error) {
            console.error('Error fetching analytics:', error);
            setError('Failed to fetch analytics');
            toast.error('Failed to fetch analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getDailyReports();
        getReports();
    }, [websiteId]);

    // Calculate overall analytics metrics from daily reports
    const calculateAnalytics = () => {
        if (!dailyReports || dailyReports.length === 0) return null;

        const uptime = dailyReports.reduce((sum, report) => sum + report.avgUptime, 0) / dailyReports.length;
        const avgResponseTime = dailyReports.reduce((sum, report) => sum + report.avgResponseTime, 0) / dailyReports.length;

        // Count incidents (days with downtime > 5%)
        const incidents = dailyReports.filter(report => report.avgDowntime > 5).length;

        return {
            uptime: uptime.toFixed(2),
            avgResponseTime: avgResponseTime.toFixed(2),
            incidents,
            dailyStats: dailyReports.map(report => ({
                date: report.date,
                responseTime: report.avgResponseTime,
                uptime: report.avgUptime,
                downtime: report.avgDowntime,
                degradedTime: report.avgDegradedTime
            }))
        };
    };

    const analyticsData = calculateAnalytics();

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="flex justify-center items-center h-64">
                    <div className="animate-pulse flex space-x-4">
                        <div className="rounded-full bg-slate-200 h-10 w-10"></div>
                        <div className="flex-1 space-y-6 py-1">
                            <div className="h-2 bg-slate-200 rounded"></div>
                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                                    <div className="h-2 bg-slate-200 rounded col-span-1"></div>
                                </div>
                                <div className="h-2 bg-slate-200 rounded"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Navbar />
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error! </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            </>

        );
    }

    if (!analyticsData) {
        return (
            <>
                <Navbar />
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Warning! </strong>
                    <span className="block sm:inline">No analytics data available.</span>
                </div>
            </>

        );
    }

    return (
        <>
            <Navbar />
            <div className="max-w-6xl mx-auto px-4 py-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">
                            {websiteInfo.name || 'Website'} Analytics
                        </h1>
                        <p className="text-gray-500 mt-1">{websiteInfo.url}</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                setLoading(true);
                                Promise.all([getDailyReports(), getReports()]);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg shadow-sm transition duration-150 ease-in-out"
                        >
                            Refresh Data
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300 border-t-4 border-green-500">
                        <h2 className="text-lg font-medium text-gray-700 mb-2">Uptime</h2>
                        <p className="text-3xl font-bold text-green-600">{analyticsData.uptime}%</p>
                        <p className="text-sm text-gray-500 mt-2">Last 15 days average</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300 border-t-4 border-blue-500">
                        <h2 className="text-lg font-medium text-gray-700 mb-2">Avg. Response Time</h2>
                        <p className="text-3xl font-bold text-blue-600">{analyticsData.avgResponseTime} ms</p>
                        <p className="text-sm text-gray-500 mt-2">Last 15 days average</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300 border-t-4 border-red-500">
                        <h2 className="text-lg font-medium text-gray-700 mb-2">Incidents</h2>
                        <p className="text-3xl font-bold text-red-600">{analyticsData.incidents}</p>
                        <p className="text-sm text-gray-500 mt-2">Days with greater 5% downtime</p>
                    </div>
                </div>

                {/* Time-based Analytics */}
                {timelyAnalytics && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-lg font-medium text-gray-700 mb-4">Daily Report</h2>
                            {timelyAnalytics.daily ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Response Time:</span>
                                        <span className="font-semibold">{timelyAnalytics.daily.avgResponseTime} ms</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Uptime:</span>
                                        <span className="font-semibold text-green-600">{timelyAnalytics.daily.avgUptime}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Downtime:</span>
                                        <span className="font-semibold text-red-600">{timelyAnalytics.daily.avgDowntime}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Degraded:</span>
                                        <span className="font-semibold text-yellow-600">{timelyAnalytics.daily.avgDegradedTime}%</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No daily data available</p>
                            )}
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-lg font-medium text-gray-700 mb-4">Monthly Report</h2>
                            {timelyAnalytics.monthly ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Response Time:</span>
                                        <span className="font-semibold">{timelyAnalytics.monthly.avgResponseTime} ms</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Uptime:</span>
                                        <span className="font-semibold text-green-600">{timelyAnalytics.monthly.avgUptime}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Downtime:</span>
                                        <span className="font-semibold text-red-600">{timelyAnalytics.monthly.avgDowntime}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Degraded:</span>
                                        <span className="font-semibold text-yellow-600">{timelyAnalytics.monthly.avgDegradedTime}%</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2">{timelyAnalytics.monthly.period}</div>
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No monthly data available</p>
                            )}
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-lg font-medium text-gray-700 mb-4">Yearly Report</h2>
                            {timelyAnalytics.yearly ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Response Time:</span>
                                        <span className="font-semibold">{timelyAnalytics.yearly.avgResponseTime} ms</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Uptime:</span>
                                        <span className="font-semibold text-green-600">{timelyAnalytics.yearly.avgUptime}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Downtime:</span>
                                        <span className="font-semibold text-red-600">{timelyAnalytics.yearly.avgDowntime}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Degraded:</span>
                                        <span className="font-semibold text-yellow-600">{timelyAnalytics.yearly.avgDegradedTime}%</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2">{timelyAnalytics.yearly.period}</div>
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No yearly data available</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Response Time Chart */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-bold mb-4">Response Time History</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={analyticsData.dailyStats}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip formatter={(value) => [`${value} ms`, 'Response Time']} />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="responseTime"
                                    name="Response Time"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 8 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Availability Chart */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-bold mb-4">Availability Metrics</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={analyticsData.dailyStats}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis domain={[0, 100]} label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip formatter={(value) => [`${value}%`, 'Value']} />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="uptime"
                                    name="Uptime"
                                    stroke="#10B981"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="downtime"
                                    name="Downtime"
                                    stroke="#EF4444"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="degradedTime"
                                    name="Degraded"
                                    stroke="#F59E0B"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status History Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <h2 className="text-xl font-bold p-6 border-b">Daily Reports History</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Up Time
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Down Time
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Degraded Time
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Response Time
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {analyticsData.dailyStats.map((stat, index) => (
                                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {stat.date}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                            {stat.uptime.toFixed(2)}%
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                                            {stat.downtime.toFixed(2)}%
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">
                                            {stat.degradedTime.toFixed(2)}%
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {stat.responseTime} ms
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>

    );
};

export default Analytics;