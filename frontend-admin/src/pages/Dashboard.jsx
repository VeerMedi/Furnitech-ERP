import React, { useEffect, useState } from 'react';
import { statsAPI } from '../services/api';
import Card from '../components/Card';
import { Building2, CheckCircle2, Settings, Activity } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await statsAPI.getSystemStats();
      setStats(response.data.data || {});
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Multi-tenant platform overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Organizations</p>
              <p className="text-2xl font-semibold text-foreground mt-2">{stats?.totalOrganizations || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Organizations</p>
              <p className="text-2xl font-semibold text-primary mt-2">{stats?.activeOrganizations || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Features</p>
              <p className="text-2xl font-semibold text-foreground mt-2">{stats?.totalFeatures || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-md bg-secondary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-secondary" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">System Status</p>
              <p className="text-base font-semibold text-primary mt-2">Operational</p>
            </div>
            <div className="w-10 h-10 rounded-md bg-secondary/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-secondary" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Platform Overview" description="Multi-tenant system information">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm font-medium">Platform Type</span>
              <span className="text-sm text-primary">Multi-Tenant SaaS</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm font-medium">Data Isolation</span>
              <span className="text-sm text-primary">Enabled ✓</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">Admin Access</span>
              <span className="text-sm text-primary">Full Control</span>
            </div>
          </div>
        </Card>

        <Card title="System Health" description="Monitor system performance">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Database</span>
                <span className="text-sm text-primary">Healthy</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '95%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">API</span>
                <span className="text-sm text-primary">Healthy</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-secondary h-2 rounded-full" style={{ width: '98%' }}></div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
