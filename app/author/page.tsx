'use client';

import { useStore } from '@/lib/store';
import { PenTool, BarChart3, Settings2, Plus, MessageSquare, Eye, Heart } from 'lucide-react';

export default function AuthorDashboard() {
  const { role } = useStore();

  if (role !== 'author' && role !== 'admin') {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-500 text-sm">You must be an author to view this page. Use the profile generic to switch roles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Author Studio</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your stories, view analytics, and engage with your readers.</p>
        </div>
        <button className="px-4 py-2 bg-accent text-white hover:opacity-90 rounded-lg font-medium flex items-center gap-2 transition">
          <Plus className="h-5 w-5" /> New Story
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Reads" value="1.2M" trend="+12% this month" icon={<Eye className="h-5 w-5 text-blue-500" />} />
        <StatCard title="Total Votes" value="45K" trend="+5% this month" icon={<Heart className="h-5 w-5 text-red-500" />} />
        <StatCard title="Total Comments" value="3,204" trend="+18% this month" icon={<MessageSquare className="h-5 w-5 text-green-500" />} />
      </div>

      <div className="bg-brand-bg dark:bg-gray-800 rounded-xl shadow-sm border border-subtle dark:border-gray-700 overflow-hidden">
        <div className="border-b border-subtle dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="font-bold text-lg font-serif">Your Works</h2>
          <div className="flex gap-2">
            <button className="text-[10px] uppercase tracking-widest font-bold hover:text-accent px-3 py-1 bg-brand-muted dark:bg-gray-700 rounded">Published</button>
            <button className="text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-brand-text dark:hover:text-gray-200 px-3 py-1">Drafts</button>
          </div>
        </div>
        
        <div className="divide-y divide-subtle dark:divide-gray-700">
          {[
            { title: 'The Silent Echo', status: 'Published', chapters: 24, views: '1.2M' },
            { title: 'Echoes of Tomorrow (Draft)', status: 'Draft', chapters: 3, views: '-' }
          ].map((work, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/50 transition">
              <div className="flex items-center gap-4">
                <div className="h-16 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                <div>
                  <h3 className="font-semibold">{work.title}</h3>
                  <div className="flex gap-2 text-xs text-gray-500 mt-1">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">{work.status}</span>
                    <span>{work.chapters} Parts</span>
                    {work.views !== '-' && <span>• {work.views} reads</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-800"><PenTool className="h-4 w-4" /></button>
                <button className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-800"><BarChart3 className="h-4 w-4" /></button>
                <button className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-800"><Settings2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, icon }: { title: string, value: string, trend: string, icon: React.ReactNode }) {
  return (
    <div className="bg-brand-bg dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-subtle dark:border-gray-700">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{title}</p>
          <h3 className="text-2xl font-bold font-serif mt-1">{value}</h3>
        </div>
        <div className="p-2 bg-brand-muted dark:bg-gray-900 rounded-lg">{icon}</div>
      </div>
      <p className="text-xs font-medium text-green-600 dark:text-green-400">{trend}</p>
    </div>
  );
}
