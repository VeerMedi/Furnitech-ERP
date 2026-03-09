import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Package, CheckCircle, AlertCircle } from 'lucide-react';
import PreProductionDashboard from './PreProductionDashboard';
import PostProductionDashboard from './PostProductionDashboard';

const Production = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pre-production');
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check user role - ONLY Production Manager should access
    const authData = localStorage.getItem('auth');
    const orgUser = localStorage.getItem('orgUser');

    let userRole = '';
    let email = '';

    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        userRole = parsed.user?.userRole || '';
        email = parsed.user?.email || '';
      } catch (e) {
        console.error('Failed to parse auth data:', e);
      }
    }

    if (!userRole && orgUser) {
      try {
        const parsed = JSON.parse(orgUser);
        userRole = parsed.userRole || '';
        email = parsed.email || '';
      } catch (e) {
        console.error('Failed to parse orgUser:', e);
      }
    }

    console.log('🔍 PRODUCTION DASHBOARD ACCESS CHECK:');
    console.log('   Email:', email);
    console.log('   Role:', userRole);

    // STRICT CHECK: Only Production Manager role allowed
    // Even Admin cannot access (as per requirement)
    if (userRole === 'Production Manager' || userRole === 'Production') {
      console.log('✅ Access granted - Production Manager detected');
      setHasAccess(true);
    } else {
      console.log('❌ Access denied - Redirecting to dashboard');
      navigate('/dashboard');
      return;
    }

    setLoading(false);
  }, [navigate]);

  const tabs = [
    { id: 'pre-production', name: 'Pre-Production', icon: Package },
    { id: 'post-production', name: 'Post-Production', icon: CheckCircle }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Production Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="bg-red-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the Production Dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="py-4">
            <h1 className="text-3xl font-bold text-gray-900">Production Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage pre and post-production workflows</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                    ? 'border-red-700 text-red-700 bg-red-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'pre-production' && <PreProductionDashboard />}
        {activeTab === 'post-production' && <PostProductionDashboard />}
      </div>
    </div>
  );
};

export default Production;
