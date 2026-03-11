import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Member } from '../types';
import { Search, Trash2, Edit2, Phone, Calendar, CheckCircle, Clock, AlertCircle, MessageCircle, X } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

export default function MembersList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  const plans = {
    'Monthly Plan': 1,
    '3 Month Plan': 3,
    '6 Month Plan': 6,
    'Yearly Plan': 12
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    // Validate Aadhaar Number
    if (editingMember.aadhaarNumber.length !== 12 || !/^\d+$/.test(editingMember.aadhaarNumber)) {
      toast.error('Aadhaar Number must be exactly 12 digits.');
      return;
    }

    if (editingMember.age <= 0 || editingMember.age > 120) {
      toast.error('Please enter a valid age between 1 and 120.');
      return;
    }

    setUpdateLoading(true);
    const loadingToast = toast.loading('Updating member...');

    try {
      const { id, ...data } = editingMember;
      const cleanedPhone = data.phoneNumber.replace(/\D/g, '');
      await updateDoc(doc(db, 'members', id), {
        ...data,
        phoneNumber: cleanedPhone,
        age: parseInt(data.age.toString()),
        amountPaid: parseFloat(data.amountPaid.toString())
      });
      toast.success('Member updated successfully!', { id: loadingToast });
      setEditingMember(null);
    } catch (error) {
      toast.error('Failed to update member.', { id: loadingToast });
      handleFirestoreError(error, OperationType.UPDATE, `members/${editingMember.id}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  const [messageModal, setMessageModal] = useState<{ member: Member, message: string, phone: string } | null>(null);

  const formatPhoneForSMS = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    cleaned = cleaned.replace(/^(0+|00)/, '');
    if (cleaned.startsWith('910') && cleaned.length === 13) {
      cleaned = '91' + cleaned.substring(3);
    }
    if (cleaned.startsWith('9191') && cleaned.length === 14) {
      cleaned = cleaned.substring(2);
    }
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    return cleaned;
  };

  const prepareMessage = (member: Member, type: 'expiry' | 'payment') => {
    const phone = formatPhoneForSMS(member.phoneNumber);
    if (phone.length < 10) {
      toast.error(`Invalid phone number: ${member.phoneNumber}`);
      return;
    }

    let message = '';
    if (type === 'expiry') {
      const expiryDate = format(member.expiryDate.toDate(), 'MMM dd, yyyy');
      message = `Hi ${member.name}, this is a reminder from GymFlow. Your membership is expiring on ${expiryDate}. Please renew soon to continue your training!`;
    } else {
      message = `Hi ${member.name}, this is a reminder from GymFlow. Your payment for the ${member.membershipPlan} plan is currently pending. Please clear it at your earliest convenience. Thank you!`;
    }

    setMessageModal({ member, message, phone });
  };

  const triggerWhatsApp = (phone: string, message: string) => {
    // WhatsApp prefers numbers without any special characters
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    try {
      navigator.clipboard.writeText(message);
      toast.success('Message copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy message', err);
    }

    // window.open should be synchronous to avoid popup blockers
    window.open(url, '_blank');
  };

  useEffect(() => {
    const q = query(collection(db, 'members'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memberData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Member[];
      setMembers(memberData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'members');
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        await deleteDoc(doc(db, 'members', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `members/${id}`);
      }
    }
  };

  useEffect(() => {
    if (editingMember) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [editingMember]);

  const togglePayment = async (member: Member) => {
    try {
      await updateDoc(doc(db, 'members', member.id), {
        paymentStatus: member.paymentStatus === 'Paid' ? 'Pending' : 'Paid'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `members/${member.id}`);
    }
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phoneNumber.includes(searchTerm)
  );

  const getStatusBadge = (expiryDate: any) => {
    if (!expiryDate || typeof expiryDate.toDate !== 'function') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider">
          Unknown
        </span>
      );
    }
    const now = new Date();
    const expiry = expiryDate.toDate();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wider">
          <AlertCircle size={12} />
          Expired
        </span>
      );
    } else if (diffDays <= 7) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-bold uppercase tracking-wider">
          <Clock size={12} />
          Expiring Soon
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold uppercase tracking-wider">
          <CheckCircle size={12} />
          Active
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Members Directory</h1>
          <p className="text-gray-500 mt-1">Manage all registered athletes ({filteredMembers.length})</p>
        </div>
        <div className="relative max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name or phone..."
            className="w-full bg-white border-none rounded-2xl pl-12 pr-6 py-4 shadow-sm focus:ring-2 focus:ring-indigo-600 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredMembers.map((member) => (
            <motion.div
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={member.id}
              className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 font-bold text-xl border border-gray-100">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{member.name}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Phone size={14} />
                      {member.phoneNumber}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      {member.membershipPlan}
                    </span>
                    <span className="flex items-center gap-1.5 text-indigo-600 font-medium">
                      Aadhaar: {member.aadhaarNumber ? `XXXX XXXX ${member.aadhaarNumber.slice(-4)}` : 'Not Provided'}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-400 italic">
                    {member.address || 'No Address'}, {member.city || ''}, {member.state || ''} - {member.pincode || ''}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {getStatusBadge(member.expiryDate)}
                
                <button
                  onClick={() => togglePayment(member)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    member.paymentStatus === 'Paid'
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'bg-gray-100 text-gray-500 hover:bg-indigo-600 hover:text-white'
                  }`}
                >
                  {member.paymentStatus}
                </button>

                <div className="h-10 w-px bg-gray-100 mx-2 hidden md:block" />

                <div className="flex items-center gap-2">
                  <div className="text-right mr-4 hidden lg:block">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expires On</p>
                    <p className="text-sm font-bold text-gray-900">
                      {member.expiryDate && typeof member.expiryDate.toDate === 'function' 
                        ? format(member.expiryDate.toDate(), 'MMM dd, yyyy') 
                        : 'N/A'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditingMember({
                        ...member,
                        name: member.name || '',
                        phoneNumber: member.phoneNumber || '',
                        age: member.age || 0,
                        gender: member.gender || 'Male',
                        membershipPlan: member.membershipPlan || 'Monthly Plan',
                        paymentStatus: member.paymentStatus || 'Paid',
                        amountPaid: member.amountPaid || 0,
                        aadhaarNumber: member.aadhaarNumber || '',
                        address: member.address || '',
                        city: member.city || '',
                        state: member.state || '',
                        pincode: member.pincode || '',
                        status: member.status || 'Active',
                        joinDate: member.joinDate || Timestamp.now(),
                        expiryDate: member.expiryDate || Timestamp.now()
                      })}
                      title="Edit Member"
                      className="p-3 rounded-xl text-indigo-500 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button 
                      onClick={() => prepareMessage(member, member.paymentStatus === 'Pending' ? 'payment' : 'expiry')}
                      title="WhatsApp Reminder"
                      className="p-3 rounded-xl text-emerald-500 hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100"
                    >
                      <MessageCircle size={20} />
                    </button>
                    <button 
                      onClick={() => handleDelete(member.id)}
                      title="Remove Member"
                      className="p-3 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredMembers.length === 0 && (
          <div className="text-center py-20 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Search size={24} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No members found</h3>
            <p className="text-gray-500">Try adjusting your search or add a new member</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingMember && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl my-auto overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Edit Member</h2>
                  <p className="text-gray-500 text-sm">Update athlete information</p>
                </div>
                <button 
                  onClick={() => setEditingMember(null)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="p-8 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-600 transition-all"
                      value={editingMember.name || ''}
                      onChange={e => setEditingMember({ ...editingMember, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Phone Number</label>
                    <input
                      required
                      type="tel"
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-600 transition-all"
                      value={editingMember.phoneNumber || ''}
                      onChange={e => setEditingMember({ ...editingMember, phoneNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Age</label>
                    <input
                      required
                      type="number"
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-600 transition-all"
                      value={editingMember.age || ''}
                      onChange={e => setEditingMember({ ...editingMember, age: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gender</label>
                    <select
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-600 transition-all"
                      value={editingMember.gender || 'Male'}
                      onChange={e => setEditingMember({ ...editingMember, gender: e.target.value as any })}
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Membership Plan</label>
                    <select
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-600 transition-all"
                      value={editingMember.membershipPlan || 'Monthly Plan'}
                      onChange={e => setEditingMember({ ...editingMember, membershipPlan: e.target.value as any })}
                    >
                      <option value="Monthly Plan">Monthly Plan</option>
                      <option value="3 Month Plan">3 Month Plan</option>
                      <option value="6 Month Plan">6 Month Plan</option>
                      <option value="Yearly Plan">Yearly Plan</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Payment Status</label>
                    <select
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-600 transition-all"
                      value={editingMember.paymentStatus || 'Paid'}
                      onChange={e => setEditingMember({ ...editingMember, paymentStatus: e.target.value as any })}
                    >
                      <option>Paid</option>
                      <option>Pending</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Amount Paid (₹)</label>
                    <input
                      required
                      type="number"
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-600 transition-all"
                      value={editingMember.amountPaid || 0}
                      onChange={e => setEditingMember({ ...editingMember, amountPaid: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Aadhaar Number</label>
                    <input
                      required
                      type="text"
                      maxLength={12}
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-600 transition-all"
                      value={editingMember.aadhaarNumber || ''}
                      onChange={e => setEditingMember({ ...editingMember, aadhaarNumber: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Street Address</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-600 transition-all"
                      value={editingMember.address || ''}
                      onChange={e => setEditingMember({ ...editingMember, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">City</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-600 transition-all"
                      value={editingMember.city || ''}
                      onChange={e => setEditingMember({ ...editingMember, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">State</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-600 transition-all"
                      value={editingMember.state || ''}
                      onChange={e => setEditingMember({ ...editingMember, state: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pincode</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-600 transition-all"
                      value={editingMember.pincode || ''}
                      onChange={e => setEditingMember({ ...editingMember, pincode: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateLoading}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {updateLoading ? 'Updating...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Message Selection Modal */}
      <AnimatePresence>
        {messageModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">WhatsApp Reminder</h2>
                  <p className="text-gray-500 text-xs uppercase tracking-widest font-bold mt-1">To: {messageModal.member.name}</p>
                </div>
                <button 
                  onClick={() => setMessageModal(null)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Message Content</label>
                  <textarea
                    className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-sm text-gray-600 leading-relaxed focus:ring-2 focus:ring-indigo-600 outline-none transition-all resize-none"
                    rows={4}
                    value={messageModal.message}
                    onChange={(e) => setMessageModal({ ...messageModal, message: e.target.value })}
                    placeholder="Type your message here..."
                  />
                  <p className="text-[10px] text-gray-400 italic">You can edit this message before sending via WhatsApp.</p>
                </div>

                <button
                  onClick={() => {
                    triggerWhatsApp(messageModal.phone, messageModal.message);
                    setMessageModal(null);
                  }}
                  className="w-full flex items-center justify-center gap-3 p-6 rounded-3xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all border border-emerald-100"
                >
                  <MessageCircle size={24} />
                  <span className="font-bold text-sm">Send via WhatsApp</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(messageModal.message);
                    toast.success('Copied to clipboard!');
                  }}
                  className="w-full py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all border border-gray-200"
                >
                  Copy Message Only
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
