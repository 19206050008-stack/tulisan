'use client';

import { useState, useEffect } from 'react';
import { getSiteConfig } from '@/lib/supabase';
import { Search, ChevronDown, ChevronUp, Mail, MessageCircle } from 'lucide-react';

export default function HelpPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => { getSiteConfig('page_help').then(d => { setConfig(d); setLoading(false); }); }, []);

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;
  if (!config) return <div className="text-center py-16 text-gray-500">Page not configured.</div>;

  const faq = config.faq || [];
  const filtered = faq.filter((item: any) =>
    item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold font-serif">{config.title}</h1>
        {config.subtitle && <p className="text-lg text-gray-600 dark:text-gray-400">{config.subtitle}</p>}
        <div className="relative max-w-md mx-auto">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari bantuan..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-3 bg-brand-muted dark:bg-gray-800 rounded-full text-sm focus:outline-none border border-transparent focus:border-accent"
          />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold font-serif">Pertanyaan Umum</h2>
        <div className="space-y-2">
          {filtered.map((item: any, i: number) => (
            <div key={i} className="border border-subtle dark:border-gray-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left font-medium hover:bg-brand-muted dark:hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm">{item.q}</span>
                {openIndex === i ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
              </button>
              {openIndex === i && (
                <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400">{item.a}</div>
              )}
            </div>
          ))}
        </div>
        {filtered.length === 0 && <p className="text-center text-gray-500 py-8">Tidak ada hasil. Coba kata kunci lain.</p>}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {config.support_email && (
          <div className="p-6 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800 space-y-3">
            <Mail className="h-6 w-6 text-accent" />
            <h3 className="font-bold">Email Support</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{config.support_email}</p>
          </div>
        )}
        <div className="p-6 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800 space-y-3">
          <MessageCircle className="h-6 w-6 text-accent" />
          <h3 className="font-bold">Forum Komunitas</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Tanyakan dan dapatkan bantuan dari pengguna Di.tulis lainnya di halaman Community.</p>
        </div>
      </section>
    </div>
  );
}
