import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { User, Mail, Shield, Calendar, LogOut, Users, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

export default function Profile() {
  const user = auth.currentUser;
  const [admins, setAdmins] = useState<{ id: string; email: string; role: string }[]>([]);
  const [newAdminUid, setNewAdminUid] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const isSuperAdmin = user?.email === 'justinparvesh20@gmail.com';

  useEffect(() => {
    if (!isSuperAdmin) return;

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adminData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setAdmins(adminData);
    });

    return () => unsubscribe();
  }, [isSuperAdmin]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUid || !newAdminEmail) {
      toast.error('Please provide both UID and Email');
      return;
    }

    try {
      await setDoc(doc(db, 'users', newAdminUid), {
        email: newAdminEmail,
        role: 'admin'
      });
      toast.success('Admin added successfully');
      setNewAdminUid('');
      setNewAdminEmail('');
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error('Failed to add admin');
    }
  };

  const handleRemoveAdmin = async (id: string) => {
    if (id === user?.uid) {
      toast.error('You cannot remove yourself');
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', id));
      toast.success('Admin removed');
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error('Failed to remove admin');
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Admin Profile</h1>
        <p className="text-gray-500 mt-1">Manage your administrator account</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-8">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mb-4 border border-indigo-100">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full rounded-3xl object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={48} />
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{user.displayName || 'Gym Admin'}</h2>
                <p className="text-indigo-600 font-bold text-xs uppercase tracking-wider mt-1">
                  {isSuperAdmin ? 'Super Administrator' : 'System Administrator'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Email Address</p>
                  <p className="font-semibold text-gray-900 text-sm truncate">{user.email}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Access Level</p>
                  <p className="font-semibold text-gray-900 text-sm">Full Administrative Access</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Last Login</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {user.metadata.lastSignInTime ? format(new Date(user.metadata.lastSignInTime), 'MMM dd, p') : 'N/A'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => auth.signOut()}
                className="w-full mt-8 flex items-center justify-center gap-2 px-6 py-4 bg-white border border-red-100 text-red-500 font-bold rounded-2xl hover:bg-red-50 transition-all shadow-sm"
              >
                <LogOut size={20} />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        </div>

        {isSuperAdmin && (
          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Shield size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Admin Management</h3>
              </div>

              <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">User UID</label>
                  <input
                    required
                    type="text"
                    placeholder="Enter User UID"
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-600 transition-all text-sm"
                    value={newAdminUid}
                    onChange={e => setNewAdminUid(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">User Email</label>
                  <div className="flex gap-2">
                    <input
                      required
                      type="email"
                      placeholder="Enter Email"
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-600 transition-all text-sm"
                      value={newAdminEmail}
                      onChange={e => setNewAdminEmail(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </form>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2 mb-2">Current Administrators</p>
                {admins.length === 0 ? (
                  <p className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-2xl text-center">No additional admins found</p>
                ) : (
                  admins.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-400 shadow-sm">
                          <Users size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{admin.email}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{admin.id}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAdmin(admin.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
