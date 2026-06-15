'use client';

import { useEffect, useState } from 'react';
import { getAdminStats } from '@/lib/supabase';
import { Users, BookOpen, MessageSquare, Eye, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, stories: 0, comments: 0, reads: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await getAdminStats();
    setStats(data);
    setLoading(false);
  };

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-serif">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Total Users" value={stats.users} color="text-blue-500 bg-blue-100 dark:bg-blue-900/30" />
        <StatCard icon={<BookOpen className="h-5 w-5" />} label="Total Stories" value={stats.stories} color="text-green-500 bg-green-100 dark:bg-green-900/30" />
        <StatCard icon={<MessageSquare className="h-5 w-5" />} label="Total Comments" value={stats.comments} color="text-purple-500 bg-purple-100 dark:bg-purple-900/30" />
        <StatCard icon={<Eye className="h-5 w-5" />} label="Total Reads" value={stats.reads} color="text-orange-500 bg-orange-100 dark:bg-orange-900/30" />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="p-5 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      <p className="text-2xl font-bold mt-3">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}
