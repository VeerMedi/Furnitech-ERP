import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './SmartAutomation.css';
import TaskDashboard from './TaskDashboard';

const SmartAutomation = () => {
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [recentTasks, setRecentTasks] = useState([]);

    // Fetch task statistics
    const fetchStatistics = async () => {
        try {
            setLoading(true);
            const response = await api.get('/tasks/statistics');
            if (response.data.success) {
                setStatistics(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch recent tasks
    const fetchRecentTasks = async () => {
        try {
            const response = await api.get('/tasks/my-tasks?limit=10');
            if (response.data.success) {
                setRecentTasks(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching recent tasks:', error);
        }
    };

    useEffect(() => {
        fetchStatistics();
        fetchRecentTasks();

        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchStatistics();
            fetchRecentTasks();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="smart-automation-container">
            {/* Header */}
            <div className="header-section">
                <h1>⚙️ Smart Task Automation</h1>
                <p>Intelligent task management and production workflow automation system</p>
            </div>

            {/* Statistics Cards */}
            {loading && !statistics ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="loading-spinner">Loading statistics...</div>
                </div>
            ) : statistics && (
                <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <div className="stat-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Tasks</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                            {statistics.summary.total}
                        </div>
                    </div>
                    <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>In Progress</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                            {statistics.summary.inProgress}
                        </div>
                    </div>
                    <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Completion Rate</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                            {statistics.summary.completionRate}%
                        </div>
                    </div>
                    <div className="stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>System Status</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '0.5rem' }}>🟢 Operational</div>
                    </div>
                </div>
            )}

            {/* Task Management Dashboard */}
            <div className="task-dashboard-section" style={{ marginTop: '2rem' }}>
                <TaskDashboard />
            </div>
        </div>
    );
};

export default SmartAutomation;
