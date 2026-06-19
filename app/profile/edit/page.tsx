'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { getProfile, updateProfile, uploadAvatar, getAvatarOptions, getProfileFrames, supabase } from '@/lib/supabase';
import { Camera, Save, ArrowLeft, Type, Image as ImageIcon, Upload, Sparkles, X, ChevronRight } from 'lucide-react';

type AvatarType = 'letter' | 'preset' | 'upload';
type AvatarCategory = 'all' | 'animal' | 'character' | 'abstract' | 'emoji';

export default function EditProfilePage() {
  const router = useRouter();
  const { user, role, login, _hasHydrated, lang } = useStore();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [donationLinks, setDonationLinks] = useState<{platform: string; url: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Avatar system
  const [avatarType, setAvatarType] = useState<AvatarType>('letter');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [avatarOptions, setAvatarOptions] = useState<any[]>([]);
  const [frames, setFrames] = useState<any[]>([]);
  const [avatarCategory, setAvatarCategory] = useState<AvatarCategory>('all');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showFramePicker, setShowFramePicker] = useState(false);

  const labels = lang === 'en' ? {
    title: 'Edit Profile',
    avatar: 'Avatar',
    avatarType: 'Avatar Type',
    letter: 'Letter',
    letterDesc: 'First letter of your name',
    preset: 'Choose Avatar',
    presetDesc: 'Pick from fun presets',
    upload: 'Upload Photo',
    uploadDesc: 'Use your own image',
    chooseAvatar: 'Choose Avatar',
    chooseFrame: 'Choose Frame',
    noFrame: 'No Frame',
    frame: 'Frame Effect',
    frameDesc: 'Add a cool effect around your avatar',
    fullName: 'Full Name',
    username: 'Username',
    bio: 'Bio',
    bioPh: 'Tell the world about yourself...',
    location: 'Location',
    locationPh: 'City, Country',
    website: 'Website',
    websitePh: 'https://yoursite.com',
    donation: 'Donation Links',
    donationDesc: 'Add Saweria, Trakteer, or other donation links so readers can support you.',
    addDonation: '+ Add donation link',
    remove: 'Remove',
    save: 'Save Changes',
    saving: 'Saving...',
    success: 'Profile updated successfully!',
    all: 'All',
  } : {
    title: 'Edit Profil',
    avatar: 'Avatar',
    avatarType: 'Tipe Avatar',
    letter: 'Huruf',
    letterDesc: 'Huruf pertama nama Anda',
    preset: 'Pilih Avatar',
    presetDesc: 'Pilih dari koleksi lucu',
    upload: 'Upload Foto',
    uploadDesc: 'Gunakan gambar sendiri',
    chooseAvatar: 'Pilih Avatar',
    chooseFrame: 'Pilih Frame',
    noFrame: 'Tanpa Frame',
    frame: 'Efek Frame',
    frameDesc: 'Tambah efek keren di sekitar avatar',
    fullName: 'Nama Lengkap',
    username: 'Username',
    bio: 'Bio',
    bioPh: 'Ceritakan tentang diri Anda...',
    location: 'Lokasi',
    locationPh: 'Kota, Negara',
    website: 'Website',
    websitePh: 'https://situsanda.com',
    donation: 'Link Donasi',
    donationDesc: 'Tambahkan link Saweria, Trakteer, atau platform donasi lain.',
    addDonation: '+ Tambah link donasi',
    remove: 'Hapus',
    save: 'Simpan Perubahan',
    saving: 'Menyimpan...',
    success: 'Profil berhasil diperbarui!',
    all: 'Semua',
  };

  const loadProfile = async () => {
    setLoading(true);
    const profile = await getProfile(user!.id);
    if (profile) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setWebsite(profile.website || '');
      setLocation(profile.location || '');
      setAvatarUrl(profile.avatar_url || '');
      setAvatarPreview(profile.avatar_url || '');
      setDonationLinks(profile.donation_links || []);
      setAvatarType(profile.avatar_type || 'letter');
      setSelectedAvatar(profile.selected_avatar || '');
      setSelectedFrameId(profile.frame_id || null);
    }
    setLoading(false);
  };

  const loadOptions = async () => {
    const [av, fr] = await Promise.all([getAvatarOptions(), getProfileFrames()]);
    setAvatarOptions(av);
    setFrames(fr);
  };

  useEffect(() => {
    if (!_hasHydrated) return;
    if (role === 'guest') { router.push('/login'); return; }
    if (user?.id) loadProfile();
    loadOptions();
  }, [user, role, _hasHydrated]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setAvatarType('upload');
    }
  };

  const selectPresetAvatar = (url: string) => {
    setSelectedAvatar(url);
    setAvatarPreview(url);
    setAvatarType('preset');
    setAvatarFile(null);
  };

  const getDisplayAvatar = () => {
    if (avatarType === 'letter') {
      return null; // Will show letter
    }
    return avatarPreview || selectedAvatar || avatarUrl;
  };

  const selectedFrame = frames.find(f => f.id === selectedFrameId);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      let finalAvatarUrl = avatarUrl;

      if (avatarType === 'upload' && avatarFile) {
        finalAvatarUrl = await uploadAvatar(avatarFile, user!.id);
        setAvatarUrl(finalAvatarUrl);
        setAvatarFile(null);
      } else if (avatarType === 'preset') {
        finalAvatarUrl = selectedAvatar;
      } else {
        finalAvatarUrl = '';
      }

      await updateProfile(user!.id, {
        full_name: fullName,
        username,
        bio,
        website,
        location,
        avatar_url: finalAvatarUrl,
        avatar_type: avatarType,
        selected_avatar: avatarType === 'preset' ? selectedAvatar : null,
        frame_id: selectedFrameId,
        donation_links: donationLinks
      });

      login({
        ...user!,
        name: fullName,
        username,
        avatar_url: finalAvatarUrl,
        avatar_type: avatarType,
        selected_avatar: avatarType === 'preset' ? selectedAvatar : undefined,
        frame_id: selectedFrameId ?? undefined,
      }, role);
      setSuccess(labels.success);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // Filter avatar options by category
  const filteredAvatars = avatarCategory === 'all'
    ? avatarOptions
    : avatarOptions.filter(a => a.category === avatarCategory);

  // Group by category for display
  const avatarCategories: { key: AvatarCategory; label: string }[] = [
    { key: 'all', label: labels.all },
    { key: 'animal', label: '🐾 Animal' },
    { key: 'character', label: '🤖 Character' },
    { key: 'abstract', label: '🎨 Abstract' },
    { key: 'emoji', label: '😎 Emoji' },
  ];

  if (loading) {
    return <div className="text-center py-16 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-bg-soft rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-3xl font-bold font-serif">{labels.title}</h1>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{error}</div>}
      {success && <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">{success}</div>}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar Section */}
        <div className="p-5 rounded-xl border border-border bg-bg-card space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><ImageIcon className="h-4 w-4 text-accent" /> {labels.avatar}</h2>

          {/* Avatar Preview with Frame */}
          <div className="flex items-center gap-6">
            <div className="relative w-28 h-28 flex items-center justify-center">
              {/* Frame overlay */}
              {selectedFrame && (
                <div
                  className="absolute inset-0 w-28 h-28 z-10 pointer-events-none"
                  dangerouslySetInnerHTML={{ __html: selectedFrame.svg_data }}
                  style={{ animation: selectedFrame.css_animation || undefined }}
                />
              )}
              {/* Avatar image */}
              {getDisplayAvatar() ? (
                <img src={getDisplayAvatar()!} alt="Avatar" className="w-24 h-24 rounded-full object-cover z-0" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center text-3xl font-bold text-accent z-0">
                  {fullName?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              {/* Avatar type selector */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setAvatarType('letter'); setAvatarPreview(''); setSelectedAvatar(''); setAvatarFile(null); }}
                  className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-colors ${avatarType === 'letter' ? 'border-accent bg-accent/5 text-accent' : 'border-border text-tx-soft hover:bg-bg-soft'}`}
                >
                  <Type className="h-4 w-4 mx-auto mb-1" />
                  {labels.letter}
                </button>
                <button
                  type="button"
                  onClick={() => { setAvatarType('preset'); setShowAvatarPicker(true); setAvatarFile(null); }}
                  className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-colors ${avatarType === 'preset' ? 'border-accent bg-accent/5 text-accent' : 'border-border text-tx-soft hover:bg-bg-soft'}`}
                >
                  <Sparkles className="h-4 w-4 mx-auto mb-1" />
                  {labels.preset}
                </button>
                <label className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-colors cursor-pointer ${avatarType === 'upload' ? 'border-accent bg-accent/5 text-accent' : 'border-border text-tx-soft hover:bg-bg-soft'}`}>
                  <Upload className="h-4 w-4 mx-auto mb-1" />
                  {labels.upload}
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
              <p className="text-[11px] text-tx-muted">
                {avatarType === 'letter' && labels.letterDesc}
                {avatarType === 'preset' && labels.presetDesc}
                {avatarType === 'upload' && labels.uploadDesc}
              </p>
            </div>
          </div>

          {/* Frame selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-accent" /> {labels.frame}</p>
                <p className="text-[11px] text-tx-muted">{labels.frameDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFramePicker(!showFramePicker)}
                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-bg-soft transition-colors"
              >
                {selectedFrame ? (selectedFrame.name_en || selectedFrame.name) : labels.noFrame}
                <ChevronRight className={`h-3 w-3 transition-transform ${showFramePicker ? 'rotate-90' : ''}`} />
              </button>
            </div>

            {showFramePicker && (
              <div className="grid grid-cols-5 gap-2 p-3 rounded-lg bg-bg-input">
                <button
                  type="button"
                  onClick={() => { setSelectedFrameId(null); setShowFramePicker(false); }}
                  className={`p-2 rounded-lg border text-xs text-center transition-colors ${!selectedFrameId ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:bg-bg-soft'}`}
                >
                  <div className="w-8 h-8 mx-auto rounded-full border-2 border-dashed border-tx-muted flex items-center justify-center mb-1">
                    <X className="h-3 w-3" />
                  </div>
                  {labels.noFrame}
                </button>
                {frames.map(frame => (
                  <button
                    key={frame.id}
                    type="button"
                    onClick={() => { setSelectedFrameId(frame.id); setShowFramePicker(false); }}
                    className={`p-2 rounded-lg border text-xs text-center transition-colors ${selectedFrameId === frame.id ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:bg-bg-soft'}`}
                  >
                    <div className="w-8 h-8 mx-auto relative mb-1">
                      <div className="w-6 h-6 rounded-full bg-accent/20 mx-auto" />
                      <div
                        className="absolute inset-0 w-8 h-8"
                        dangerouslySetInnerHTML={{ __html: frame.svg_data }}
                      />
                    </div>
                    {lang === 'en' ? (frame.name_en || frame.name) : frame.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Avatar preset picker modal */}
          {showAvatarPicker && (
            <div className="space-y-3 p-4 rounded-lg bg-bg-input border border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{labels.chooseAvatar}</h3>
                <button type="button" onClick={() => setShowAvatarPicker(false)} className="p-1 rounded hover:bg-bg-soft">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Category tabs */}
              <div className="flex gap-1 overflow-x-auto">
                {avatarCategories.map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setAvatarCategory(cat.key)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${avatarCategory === cat.key ? 'bg-accent text-white' : 'bg-bg-card text-tx-soft hover:bg-bg-soft'}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Avatar grid */}
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto">
                {filteredAvatars.map(av => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => { selectPresetAvatar(av.image_url); setShowAvatarPicker(false); }}
                    className={`p-1 rounded-lg border transition-colors ${selectedAvatar === av.image_url ? 'border-accent bg-accent/10' : 'border-transparent hover:border-border hover:bg-bg-soft'}`}
                  >
                    <img src={av.image_url} alt={av.name} className="w-full aspect-square rounded object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium">{labels.fullName}</label>
            <input id="fullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent text-sm" />
          </div>
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">{labels.username}</label>
            <input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent text-sm" />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="bio" className="text-sm font-medium">{labels.bio}</label>
          <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder={labels.bioPh} className="w-full px-4 py-3 rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent text-sm resize-none" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="location" className="text-sm font-medium">{labels.location}</label>
            <input id="location" type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder={labels.locationPh} className="w-full px-4 py-3 rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent text-sm" />
          </div>
          <div className="space-y-2">
            <label htmlFor="website" className="text-sm font-medium">{labels.website}</label>
            <input id="website" type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder={labels.websitePh} className="w-full px-4 py-3 rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent text-sm" />
          </div>
        </div>

        {/* Donation Links */}
        <div className="space-y-3">
          <label className="text-sm font-medium">{labels.donation}</label>
          <p className="text-xs text-gray-500">{labels.donationDesc}</p>
          {donationLinks.map((link, i) => (
            <div key={i} className="flex gap-2">
              <select value={link.platform} onChange={e => { const arr = [...donationLinks]; arr[i] = { ...arr[i], platform: e.target.value }; setDonationLinks(arr); }} className="w-32 px-3 py-2.5 text-sm rounded-lg bg-bg-input text-tx border border-border focus:outline-none focus:border-accent">
                <option value="saweria">Saweria</option>
                <option value="trakteer">Trakteer</option>
                <option value="sociabuzz">Sociabuzz</option>
                <option value="karyakarsa">KaryaKarsa</option>
                <option value="custom">Lainnya</option>
              </select>
              <input type="url" value={link.url} onChange={e => { const arr = [...donationLinks]; arr[i] = { ...arr[i], url: e.target.value }; setDonationLinks(arr); }} placeholder="https://saweria.co/username" className="flex-1 px-4 py-2.5 rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent text-sm" />
              <button type="button" onClick={() => setDonationLinks(donationLinks.filter((_, j) => j !== i))} className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm">{labels.remove}</button>
            </div>
          ))}
          <button type="button" onClick={() => setDonationLinks([...donationLinks, { platform: 'saweria', url: '' }])} className="text-xs text-accent hover:underline">{labels.addDonation}</button>
        </div>

        <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
          <Save className="h-4 w-4" />
          {saving ? labels.saving : labels.save}
        </button>
      </form>
    </div>
  );
}
