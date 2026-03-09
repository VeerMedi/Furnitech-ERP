import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    organizationId: '692c54e2e78b9fa8112a7aa3', // Default organization ID for Vlite
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(formData);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Hustle House</h1>
          <p className="text-muted-foreground">Organization Portal</p>
        </div>
        
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-semibold text-center mb-6">Sign In</h2>
            
            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-[var(--radius)]">
                {error}
              </div>
            )}
            
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="user@organization.com"
              required
            />
            
            <Input
              label="Password"
              type="Text"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
            
            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              disabled={isLoading}
            >
              Sign In
            </Button>
          </form>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground mt-6">
          © 2025 Hustle House. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
