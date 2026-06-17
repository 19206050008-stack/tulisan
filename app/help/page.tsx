'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSiteConfigLocalized, createSupportTicket } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { Search, ChevronDown, ChevronUp, Mail, MessageCircle, Send, CheckCircle, Ticket } from 'lucide-react';

export default function HelpPage() {
  const { lang, user } = useStore();
  const t = translations[lang].pages;
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Ticket form state
  const [showTicket, setShowTicket] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketCat, setTicketCat] = useState('general');
  const [ticketSending, setTicketSending] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  const ticketLabels = lang === 'en' ? {
    stillNeedHelp: 'Still need help?',
    submitTicket: 'Submit a Support Ticket',
    subject: 'Subject',
    subjectPh: 'Brief summary of your issue...',
    description: 'Description',
    descPh: 'Describe your issue in detail...',
    category: 'Category',
    cats: { general: 'General', bug: 'Bug Report', feature: 'Feature Request', account: 'Account Issue', content: 'Content Report', billing: 'Billing' },
    send: 'Submit Ticket',
    cancel: 'Cancel',
    success: 'Ticket submitted! We\'ll get back to you soon.',
    loginRequired: 'Please log in to submit a support ticket.',
  } : {
    stillNeedHelp: 'Masih butuh bantuan?',
    submitTicket: 'Kirim Tiket Bantuan',
    subject: 'Subjek',
    subjectPh: 'Ringkasan singkat masalah Anda...',
    description: 'Deskripsi',
    descPh: 'Jelaskan masalah Anda secara detail...',
    category: 'Kategori',
    cats: { general: 'Umum', bug: 'Laporan Bug', feature: 'Permintaan Fitur', account: 'Masalah Akun', content: 'Laporan Konten', billing: 'Pembayaran' },
    send: 'Kirim Tiket',
    cancel: 'Batal',
    success: 'Tiket berhasil dikirim! Kami akan segera menghubungi Anda.',
    loginRequired: 'Silakan masuk untuk mengirim tiket bantuan.',
  };

  useEffect(() => {
    setLoading(true);
    getSiteConfigLocalized('page_help', lang).then(d => { setConfig(d); setLoading(false); });
  }, [lang]);

  if (loading) return <div className="text-center py-16 text-gray-500">{t.loading}</div>;
  if (!config) return <div className="text-center py-16 text-gray-500">{t.pageNotConfigured}</div>;

  const faq = config.faq || [];
  const filtered = faq.filter((item: any) =>
    item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketDesc.trim()) return;
    setTicketSending(true);
    try {
      await createSupportTicket(ticketSubject.trim(), ticketDesc.trim(), ticketCat);
      setTicketSuccess(true);
      setTicketSubject(''); setTicketDesc(''); setTicketCat('general');
      setTimeout(() => { setShowTicket(false); setTicketSuccess(false); }, 3000);
    } catch (e: any) {
      alert(e.message);
    }
    setTicketSending(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold font-serif">{config.title}</h1>
        {config.subtitle && <p className="text-lg text-tx-soft">{config.subtitle}</p>}
        <div className="relative max-w-md mx-auto">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t.searchHelp}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-3 bg-bg-input rounded-full text-sm focus:outline-none border border-transparent focus:border-accent"
          />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold font-serif">{t.faq}</h2>
        <div className="space-y-2">
          {filtered.map((item: any, i: number) => (
            <div key={i} className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left font-medium hover:bg-bg-soft transition-colors"
              >
                <span className="text-sm">{item.q}</span>
                {openIndex === i ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
              </button>
              {openIndex === i && (
                <div className="px-4 pb-4 text-sm text-tx-soft">{item.a}</div>
              )}
            </div>
          ))}
        </div>
        {filtered.length === 0 && <p className="text-center text-gray-500 py-8">{t.noResults}</p>}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {config.support_email && (
          <div className="p-6 rounded-xl border border-border bg-bg-card space-y-3">
            <Mail className="h-6 w-6 text-accent" />
            <h3 className="font-bold">{t.emailSupport}</h3>
            <p className="text-sm text-tx-soft">{config.support_email}</p>
          </div>
        )}
        <Link href="/community" className="p-6 rounded-xl border border-border bg-bg-card space-y-3 hover:border-accent/30 transition-colors">
          <MessageCircle className="h-6 w-6 text-accent" />
          <h3 className="font-bold">{t.communityForum}</h3>
          <p className="text-sm text-tx-soft">{t.communityForumDesc}</p>
        </Link>
      </section>

      {/* Support Ticket Section */}
      <section className="p-6 rounded-xl border border-border bg-bg-card space-y-4">
        <div className="flex items-center gap-3">
          <Ticket className="h-6 w-6 text-accent" />
          <div>
            <h3 className="font-bold">{ticketLabels.stillNeedHelp}</h3>
            <p className="text-xs text-tx-muted">{ticketLabels.submitTicket}</p>
          </div>
        </div>

        {ticketSuccess && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" /> {ticketLabels.success}
          </div>
        )}

        {!showTicket ? (
          <button
            onClick={() => setShowTicket(true)}
            className="w-full py-3 rounded-lg border-2 border-dashed border-border hover:border-accent/50 text-sm font-medium text-tx-soft hover:text-accent transition-colors flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" /> {ticketLabels.submitTicket}
          </button>
        ) : (
          <div className="space-y-3">
            {!user && (
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 text-sm">
                {ticketLabels.loginRequired}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">{ticketLabels.subject}</label>
                <input
                  type="text"
                  value={ticketSubject}
                  onChange={e => setTicketSubject(e.target.value)}
                  placeholder={ticketLabels.subjectPh}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">{ticketLabels.category}</label>
                <select
                  value={ticketCat}
                  onChange={e => setTicketCat(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent [&>option]:bg-bg-card [&>option]:text-tx"
                >
                  {Object.entries(ticketLabels.cats).map(([k, v]) => (
                    <option key={k} value={k}>{v as string}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{ticketLabels.description}</label>
              <textarea
                value={ticketDesc}
                onChange={e => setTicketDesc(e.target.value)}
                placeholder={ticketLabels.descPh}
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSubmitTicket}
                disabled={ticketSending || !ticketSubject.trim() || !ticketDesc.trim() || !user}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" /> {ticketSending ? '...' : ticketLabels.send}
              </button>
              <button
                onClick={() => { setShowTicket(false); setTicketSuccess(false); }}
                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-bg-soft transition-colors"
              >
                {ticketLabels.cancel}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
