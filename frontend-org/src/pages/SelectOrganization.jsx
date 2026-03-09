import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Card from '../components/Card';
import Button from '../components/Button';
import { Building2, ArrowRight, Loader2 } from 'lucide-react';

const SelectOrganization = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      // Fetch all active organizations (public endpoint)
      const response = await axios.get(`${API_URL}/auth/organizations`);
      setOrganizations(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrg = (org) => {
    setSelectedOrg(org);
  };

  const handleContinue = () => {
    if (selectedOrg) {
      // Store the selected organization ID and navigate to login
      localStorage.setItem('selectedOrgId', selectedOrg._id);
      localStorage.setItem('selectedOrgName', selectedOrg.name);
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <a href="https://thehustlehouseofficial.com" target="_blank" rel="noopener noreferrer" className="inline-block">
            <img src="/logo/THH_Logo1.png" alt="The Hustle House" className="max-h-20 w-auto mx-auto mb-2 object-contain cursor-pointer hover:opacity-80 transition-opacity" />
          </a>
          <a href="https://www.vlitefurnitech.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
            Select Your Organization
          </a>
        </div>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Choose Organization</h2>

          {organizations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No active organizations found.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please contact your administrator.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {organizations.map((org) => (
                  <button
                    key={org._id}
                    onClick={() => handleSelectOrg(org)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedOrg?._id === org._id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={`p-2 rounded-lg ${
                          selectedOrg?._id === org._id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{org.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{org.email}</p>
                        {org.subscriptionPlan && (
                          <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded bg-muted">
                            {org.subscriptionPlan}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <Button
                onClick={handleContinue}
                disabled={!selectedOrg}
                className="w-full"
              >
                Continue to Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Don't see your organization?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/create-organization')}
                    className="text-primary hover:underline font-medium"
                  >
                    Create a new one
                  </button>
                </p>
              </div>
            </>
          )}
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          © 2026 <a href="https://thehustlehouseofficial.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">The Hustle House</a>. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default SelectOrganization;
