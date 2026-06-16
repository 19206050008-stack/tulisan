'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { getProfile, updateProfile, uploadAvatar } from '@/lib/supabase';
import { Camera, Save, ArrowLeft } from 'lucide-react';

export default function EditProfilePage() {
  const router = useRouter();
  const { user, role, login, _hasHydrated } = useStore();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [donationLinks, setDonationLinks] = useState<{platform: string; url: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!_hasHydrated) return; // Wait for store hydration
    if (role === 'guest') {
      router.push('/login');
      return;
    }
    if (user?.id) {
      loadProfile();
    }
  }, [user, role, _hasHydrated]);

  const loadProfile = async () => {
    setLoading(true);
    const profile = await getProfile(user.id);
    if (profile) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setWebsite(profile.website || '');
      setLocation(profile.location || '');
      setAvatarUrl(profile.avatar_url || '');
      setAvatarPreview(profile.avatar_url || '');
      setDonationLinks(profile.donation_links || []);
    }
    setLoading(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      let finalAvatarUrl = avatarUrl;

      if (avatarFile) {
        finalAvatarUrl = await uploadAvatar(avatarFile, user.id);
        setAvatarUrl(finalAvatarUrl);
        setAvatarFile(null);
      }

      await updateProfile(user.id, {
        full_name: fullName,
        username,
        bio,
        website,
        location,
        avatar_url: finalAvatarUrl,
        donation_links: donationLinks
      });

      login({ ...user, name: fullName, username }, role);
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-brand-muted dark:hover:bg-gray-800 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-3xl font-bold font-serif">Edit Profile</h1>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{error}</div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">{success}</div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-24 h-24 rounded-full object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-brand-muted dark:bg-gray-700 flex items-center justify-center text-3xl font-bold text-gray-400">
                {fullName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <label className="absolute bottom-0 right-0 p-2 bg-accent text-white rounded-full cursor-pointer hover:opacity-90 transition-opacity shadow-lg">
              <Camera className="h-4 w-4" />
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>
          <div className="text-sm text-gray-500">
            <p className="font-medium text-brand-text dark:text-gray-100">Profile Photo</p>
            <p>Click the camera icon to upload a new photo</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium">Full Name</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-brand-muted dark:bg-gray-800 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent text-sm"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-brand-muted dark:bg-gray-800 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="bio" className="text-sm font-medium">Bio</label>
          <textarea
            id="bio"
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={4}
            placeholder="Tell the world about yourself..."
            className="w-full px-4 py-3 rounded-lg bg-brand-muted dark:bg-gray-800 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent text-sm resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="location" className="text-sm font-medium">Location</label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="City, Country"
              className="w-full px-4 py-3 rounded-lg bg-brand-muted dark:bg-gray-800 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent text-sm"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="website" className="text-sm font-medium">Website</label>
            <input
              id="website"
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://yoursite.com"
              className="w-full px-4 py-3 rounded-lg bg-brand-muted dark:bg-gray-800 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent text-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Link Donasi</label>
          <p className="text-xs text-gray-500">Tambahkan link Saweria, Trakteer, atau platform donasi lain agar pembaca bisa mendukung Anda.</p>
          {donationLinks.map((link, i) => (
            <div key={i} className="flex gap-2">
              <select value={link.platform} onChange={e => { const arr = [...donationLinks]; arr[i] = { ...arr[i], platform: e.target.value }; setDonationLinks(arr); }} className="w-32 px-3 py-2.5 text-sm rounded-lg bg-brand-muted dark:bg-gray-800 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent">
                <option value="saweria">Saweria</option>
                <option value="trakteer">Trakteer</option>
                <option value="sociabuzz">Sociabuzz</option>
                <option value="karyakarsa">KaryaKarsa</option>
                <option value="custom">Lainnya</option>
              </select>
              <input type="url" value={link.url} onChange={e => { const arr = [...donationLinks]; arr[i] = { ...arr[i], url: e.target.value }; setDonationLinks(arr); }} placeholder="https://saweria.co/username" className="flex-1 px-4 py-2.5 rounded-lg bg-brand-muted dark:bg-gray-800 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent text-sm" />
              <button type="button" onClick={() => setDonationLinks(donationLinks.filter((_, j) => j !== i))} className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm">Hapus</button>
            </div>
          ))}
          <button type="button" onClick={() => setDonationLinks([...donationLinks, { platform: 'saweria', url: '' }])} className="text-xs text-accent hover:underline">+ Tambah link donasi</button>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
