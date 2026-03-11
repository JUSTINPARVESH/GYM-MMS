import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Calendar, Phone, User, CreditCard, ChevronRight } from 'lucide-react';
import { addMonths } from 'date-fns';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';

export default function AddMember() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    phoneNumber: '',
    gender: 'Male',
    membershipPlan: 'Monthly Plan',
    paymentStatus: 'Paid',
    amountPaid: '',
    aadhaarNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });

  const plans = {
    'Monthly Plan': 1,
    '3 Month Plan': 3,
    '6 Month Plan': 6,
    'Yearly Plan': 12
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate Aadhaar Number
    if (formData.aadhaarNumber.length !== 12) {
      toast.error('Aadhaar Number must be exactly 12 digits.');
      return;
    }

    if (!/^\d+$/.test(formData.aadhaarNumber)) {
      toast.error('Aadhaar Number must contain only digits.');
      return;
    }

    // Validate Phone Number
    const cleanedPhone = formData.phoneNumber.replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number.');
      return;
    }

    if (!formData.name || !formData.phoneNumber || !formData.age || !formData.address || !formData.city || !formData.state || !formData.pincode) {
      toast.error('Please fill in all required fields including address.');
      return;
    }

    if (parseInt(formData.age) <= 0 || parseInt(formData.age) > 120) {
      toast.error('Please enter a valid age between 1 and 120.');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Registering member...');

    try {
      const joinDate = new Date();
      const monthsToAdd = plans[formData.membershipPlan as keyof typeof plans] || 1;
      const expiryDate = addMonths(joinDate, monthsToAdd);

      await addDoc(collection(db, 'members'), {
        ...formData,
        phoneNumber: cleanedPhone,
        age: parseInt(formData.age),
        amountPaid: parseFloat(formData.amountPaid) || 0,
        joinDate: Timestamp.fromDate(joinDate),
        expiryDate: Timestamp.fromDate(expiryDate),
        status: 'Active'
      });

      toast.success('Member registered successfully!', { id: loadingToast });
      
      // Small delay for UX before navigating to Dashboard
      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to register member. Please check your connection.', { id: loadingToast });
      // Don't throw here to avoid crashing the UI, just handle it
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Add New Member</h1>
        <p className="text-gray-500 mt-1">Register a new athlete to your gym</p>
      </header>

      <motion.form 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit} 
        className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <User size={16} className="text-indigo-600" />
                Full Name
              </label>
              <input
                required
                type="text"
                placeholder="John Doe"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-600 transition-all"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Phone size={16} className="text-indigo-600" />
                Phone Number
              </label>
              <input
                required
                type="tel"
                placeholder="9876543210"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-600 transition-all"
                value={formData.phoneNumber}
                onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Age</label>
              <input
                required
                type="number"
                placeholder="25"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-600 transition-all"
                value={formData.age}
                onChange={e => setFormData({ ...formData, age: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Gender</label>
              <select
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-600 transition-all appearance-none"
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Calendar size={16} className="text-indigo-600" />
                Membership Plan
              </label>
              <select
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-600 transition-all appearance-none"
                value={formData.membershipPlan}
                onChange={e => setFormData({ ...formData, membershipPlan: e.target.value })}
              >
                <option value="Monthly Plan">Monthly Plan</option>
                <option value="3 Month Plan">3 Month Plan</option>
                <option value="6 Month Plan">6 Month Plan</option>
                <option value="Yearly Plan">Yearly Plan</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <CreditCard size={16} className="text-indigo-600" />
                Payment Status
              </label>
              <select
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-600 transition-all appearance-none"
                value={formData.paymentStatus}
                onChange={e => setFormData({ ...formData, paymentStatus: e.target.value })}
              >
                <option>Paid</option>
                <option>Pending</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Aadhaar Number</label>
              <input
                required
                type="text"
                maxLength={12}
                placeholder="1234 5678 9012"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-600 transition-all"
                value={formData.aadhaarNumber}
                onChange={e => setFormData({ ...formData, aadhaarNumber: e.target.value.replace(/\D/g, '') })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-gray-700">Street Address</label>
              <input
                required
                type="text"
                placeholder="123 Gym Street"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-600 transition-all"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">City</label>
              <input
                required
                type="text"
                placeholder="Mumbai"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-600 transition-all"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">State</label>
              <input
                required
                type="text"
                placeholder="Maharashtra"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-600 transition-all"
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Pincode</label>
              <input
                required
                type="text"
                placeholder="400001"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-600 transition-all"
                value={formData.pincode}
                onChange={e => setFormData({ ...formData, pincode: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Amount Paid (₹)</label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-600 transition-all"
                value={formData.amountPaid}
                onChange={e => setFormData({ ...formData, amountPaid: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-8 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/members')}
            className="px-8 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Register Member</span>
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
