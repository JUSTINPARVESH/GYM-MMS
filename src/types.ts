import { Timestamp } from 'firebase/firestore';

export type MembershipPlan = 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';
export type PaymentStatus = 'Paid' | 'Pending';
export type MemberStatus = 'Active' | 'Expiring Soon' | 'Expired';

export interface Member {
  id: string;
  name: string;
  age: number;
  phoneNumber: string;
  gender: 'Male' | 'Female' | 'Other';
  membershipPlan: MembershipPlan;
  joinDate: Timestamp;
  expiryDate: Timestamp;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  status: MemberStatus;
  aadhaarNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  expiringSoon: number;
  expired: number;
  totalRevenue: number;
  monthlyRevenue: { month: string; amount: number }[];
}
