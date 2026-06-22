'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { sendAudioRequest as _sendAudioRequest } from '@/lib/supabase/admin';
import { AudioVisualizer } from './AudioVisualizer';
import { Play, Pause, FileAudio, CheckCircle, XCircle } from 'lucide-react';

interface AudioRequestProps {
    storyId: string;
    chapterId?: string;
    chapterTitle?: string;
}

export function AudioRequest({ storyId, chapterId, chapterTitle }: AudioRequestProps) {
    const { user } = useStore();
    const [requesting, setRequesting] = useState(false);
    const [requested, setRequested] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [notes, setNotes] = useState('');
    const [voiceStyle, setVoiceStyle] = useState<'narrative' | 'dramatic' | 'conversational'>('narrative');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        setRequesting(true);
        setError('');
        
        try {
            await _sendAudioRequest({
                storyId,
                chapterId,
                notes: notes || undefined,
                voiceStyle,
            });
            setRequested(true);
            setTimeout(() => setShowForm(false), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to request audio');
        } finally {
            setRequesting(false);
        }
    };

    if (!user) {
        return null;
    }

    return (
        <div className="mt-4 p-4 rounded-xl bg-bg-card border border-border">
            {!requested ? (
                <>
                    {!showForm ? (
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                        >
                            <FileAudio className="h-4 w-4" />
                            Minta Baca Suara
                        </button>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-tx-muted">Gaya Suara</label>
                                <select
                                    value={voiceStyle}
                                    onChange={(e) => setVoiceStyle(e.target.value as any)}
                                    className="w-full mt-1 px-3 py-2 text-sm rounded-lg bg-bg-input border border-border [&>option]:bg-bg-card [&>option]:text-tx"
                                >
                                    <option value="narrative">Narasi (Standar)</option>
                                    <option value="dramatic">Dramatis</option>
                                    <option value="conversational">Konversasional</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="text-xs font-medium text-tx-muted">Catatan Tambahan (opsional)</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Contoh: Gunakan suara wanita dengan tempo sedang..."
                                    rows={3}
                                    maxLength={500}
                                    className="w-full mt-1 px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent resize-none"
                                />
                                <p className="text-[10px] text-right text-tx-muted mt-1">{notes.length}/500</p>
                            </div>

                            {error && (
                                <p className="text-xs text-red-500">{error}</p>
                            )}

                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={requesting}
                                    className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {requesting ? 'Mengirim...' : 'Ajukan Permintaan'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-sm font-medium rounded-lg bg-bg-input text-tx-muted hover:bg-bg-soft transition-colors"
                                >
                                    Batal
                                </button>
                            </div>
                        </form>
                    )}
                </>
            ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Permintaan terkirim!</p>
                        <p className="text-xs text-green-600 dark:text-green-400">Tim kami akan meninjau dan membuat audio Anda.</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 transition-colors"
                        title="Kirim permintaan baru"
                    >
                        <FileAudio className="h-4 w-4 text-green-600 dark:text-green-300" />
                    </button>
                </div>
            )}
        </div>
    );
}
