import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  // SINGLE TENANT: No organization selection needed
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // SINGLE TENANT: Login directly without organization selection
    try {
      const result = await login(formData);

      // Role-based redirection
      const userRole = result?.userRole;
      const userEmail = result?.email;

      // jasleen@vlite.com always goes to admin dashboard
      if (userEmail === 'jasleen@vlite.com') {
        navigate('/dashboard');
      } else if (userRole === 'Salesman') {
        navigate('/salesman-dashboard');
      } else if (userRole === 'POC') {
        navigate('/poc-assignment');
      } else if (userRole === 'Design Dept Head') {
        navigate('/design-assignment'); // Management dashboard with assignments
      } else if (userRole === 'Design') {
        navigate('/drawings'); // Regular designer dashboard
      } else {
        navigate('/dashboard');
      }

    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="https://thehustlehouseofficial.com" target="_blank" rel="noopener noreferrer" className="inline-block">
            <img src="/logo/THH_Logo1.png" alt="The Hustle House" className="max-h-20 w-auto mx-auto mb-2 object-contain cursor-pointer hover:opacity-80 transition-opacity" />
          </a>
          <a href="https://www.vlitefurnitech.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
            Vlite Portal
          </a>
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
              type="text"
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

            {/* Organization creation removed - Single Tenant Mode */}
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          © 2026 <a href="https://thehustlehouseofficial.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">The Hustle House</a>. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
