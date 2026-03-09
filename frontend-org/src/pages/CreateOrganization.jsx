import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import { Building2, User, Mail, Phone, MapPin, Lock } from 'lucide-react';
import { toast } from '../hooks/useToast';

const CreateOrganization = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    // Organization Details
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
    },
    // Admin User Details
    adminUser: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        address: { ...formData.address, [field]: value },
      });
    } else if (name.startsWith('adminUser.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        adminUser: { ...formData.adminUser, [field]: value },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }

    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.adminUser.password !== formData.adminUser.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.adminUser.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';

      // Generate slug from name
      const slug = formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

      const payload = {
        name: formData.name,
        slug,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        subscriptionPlan: 'TRIAL', // Default plan
        adminUser: {
          firstName: formData.adminUser.firstName,
          lastName: formData.adminUser.lastName,
          email: formData.adminUser.email,
          phone: formData.adminUser.phone,
          password: formData.adminUser.password,
        },
        seedData: true, // Seed initial data
      };

      const response = await axios.post(`${API_URL}/auth/register-organization`, payload);

      if (response.data.success) {
        const org = response.data.data;

        // Show success message
        toast.success(`Organization "${org.name}" created! ✅\n\nLogin with:\nEmail: ${formData.adminUser.email}\nPassword: ${formData.adminUser.password}`);

        // Store org ID and redirect to login
        localStorage.setItem('selectedOrgId', org._id);
        localStorage.setItem('selectedOrgName', org.name);
        navigate('/login');
      }
    } catch (err) {
      console.error('Organization creation error:', err);
      setError(err.response?.data?.message || 'Failed to create organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <a href="https://thehustlehouseofficial.com" target="_blank" rel="noopener noreferrer" className="inline-block">
            <img src="/logo/THH_Logo1.png" alt="The Hustle House" className="max-h-20 w-auto mx-auto mb-2 object-contain cursor-pointer hover:opacity-80 transition-opacity" />
          </a>
          <a href="https://www.vlitefurnitech.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
            Create Your Organization
          </a>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Sign Up</h2>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-primary hover:underline"
              >
                Already have an account? Login
              </button>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-[var(--radius)]">
                {error}
              </div>
            )}

            {/* Organization Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Organization Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Organization Name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Vlite Furnitures"
                    required
                    icon={<Building2 className="h-4 w-4" />}
                  />
                </div>

                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="organization@example.com"
                  required
                  icon={<Mail className="h-4 w-4" />}
                />

                <Input
                  label="Phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  icon={<Phone className="h-4 w-4" />}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Street Address"
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  placeholder="123 Main Street"
                  icon={<MapPin className="h-4 w-4" />}
                />

                <Input
                  label="City"
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  placeholder="Mumbai"
                />

                <Input
                  label="State"
                  type="text"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  placeholder="Maharashtra"
                />

                <Input
                  label="ZIP Code"
                  type="text"
                  name="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={handleChange}
                  placeholder="400001"
                />
              </div>
            </div>

            {/* Admin User Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Admin User</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  type="text"
                  name="adminUser.firstName"
                  value={formData.adminUser.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  required
                  icon={<User className="h-4 w-4" />}
                />

                <Input
                  label="Last Name"
                  type="text"
                  name="adminUser.lastName"
                  value={formData.adminUser.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  required
                />

                <Input
                  label="Email"
                  type="email"
                  name="adminUser.email"
                  value={formData.adminUser.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  required
                  icon={<Mail className="h-4 w-4" />}
                />

                <Input
                  label="Phone"
                  type="tel"
                  name="adminUser.phone"
                  value={formData.adminUser.phone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  icon={<Phone className="h-4 w-4" />}
                />

                <Input
                  label="Password"
                  type="password"
                  name="adminUser.password"
                  value={formData.adminUser.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 characters"
                  required
                  icon={<Lock className="h-4 w-4" />}
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  name="adminUser.confirmPassword"
                  value={formData.adminUser.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  required
                  icon={<Lock className="h-4 w-4" />}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/login')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                loading={loading}
                disabled={loading}
              >
                Create Organization
              </Button>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              By creating an account, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          © 2026 <a href="https://thehustlehouseofficial.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">The Hustle House</a>. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default CreateOrganization;
