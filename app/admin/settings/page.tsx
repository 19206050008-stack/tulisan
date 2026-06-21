'use client';

import { useEffect, useState, useRef } from 'react';
import { getAllSiteConfig, setSiteConfig, supabase } from '@/lib/supabase';
import { Save, Settings, Globe, Key, Copy, Heart, Upload, RotateCcw, Image as ImageIcon } from 'lucide-react';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const [siteName, setSiteName] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [siteTagline, setSiteTagline] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [faviconUploading, setFaviconUploading] = useState(false);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [maxStoriesPerUser, setMaxStoriesPerUser] = useState(50);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [ssoProvider, setSsoProvider] = useState('google');
  const [ssoClientId, setSsoClientId] = useState('');
  const [ssoClientSecret, setSsoClientSecret] = useState('');
  const [ssoCallbackUrl, setSsoCallbackUrl] = useState('');

  const [donationEnabled, setDonationEnabled] = useState(true);
  const [donationPlatforms, setDonationPlatforms] = useState<string[]>(['saweria', 'trakteer', 'sociabuzz', 'karyakarsa', 'custom']);

  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    tiktok: '',
    twitter: '',
    youtube: '',
    facebook: '',
  });

  const loadConfig = async () => {
    setLoading(true);
    const data = await getAllSiteConfig();
    setSiteName(data.site_name || 'Di.tulis');
    setSiteDescription(data.site_description || '');
    setSiteTagline(data.site_tagline || '');
    setFaviconUrl(data.favicon_url || '');
    setAllowRegistration(data.allow_registration !== false);
    setAllowComments(data.allow_comments !== false);
    setMaxStoriesPerUser(data.max_stories_per_user || 50);
    setMaintenanceMode(data.maintenance_mode === true);
    setSsoEnabled(data.sso_enabled === true);
    setSsoProvider(data.sso_provider || 'google');
    setSsoClientId(data.sso_client_id || '');
    setSsoClientSecret(data.sso_client_secret || '');
    setSsoCallbackUrl(data.sso_callback_url || (typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback` : ''));
    setDonationEnabled(data.donation_enabled !== false);
    setDonationPlatforms(data.donation_platforms || ['saweria', 'trakteer', 'sociabuzz', 'karyakarsa', 'custom']);
    setSocialLinks({
      instagram: data.social_instagram || '',
      tiktok: data.social_tiktok || '',
      twitter: data.social_twitter || '',
      youtube: data.social_youtube || '',
      facebook: data.social_facebook || '',
    });
    setLoading(false);
  };

  useEffect(() => { loadConfig(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    try {
      await Promise.all([
        setSiteConfig('site_name', siteName),
        setSiteConfig('site_description', siteDescription),
        setSiteConfig('site_tagline', siteTagline),
        setSiteConfig('favicon_url', faviconUrl),
        setSiteConfig('allow_registration', allowRegistration),
        setSiteConfig('allow_comments', allowComments),
        setSiteConfig('max_stories_per_user', maxStoriesPerUser),
        setSiteConfig('maintenance_mode', maintenanceMode),
        setSiteConfig('sso_enabled', ssoEnabled),
        setSiteConfig('sso_provider', ssoProvider),
        setSiteConfig('sso_client_id', ssoClientId),
        setSiteConfig('sso_client_secret', ssoClientSecret),
        setSiteConfig('sso_callback_url', ssoCallbackUrl),
        setSiteConfig('donation_enabled', donationEnabled),
        setSiteConfig('donation_platforms', donationPlatforms),
        setSiteConfig('social_instagram', socialLinks.instagram),
        setSiteConfig('social_tiktok', socialLinks.tiktok),
        setSiteConfig('social_twitter', socialLinks.twitter),
        setSiteConfig('social_youtube', socialLinks.youtube),
        setSiteConfig('social_facebook', socialLinks.facebook),
      ]);
      setSuccess('Settings saved successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const generateCallbackUrl = () => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    setSsoCallbackUrl(`${base}/api/auth/callback/${ssoProvider}`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold font-serif flex items-center gap-2"><Settings className="h-6 w-6" /> Site Settings</h1>

      {success && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">{success}</div>
      )}

      <div className="space-y-5">
        <section className="p-5 rounded-xl border border-border bg-bg-card space-y-4">
          <h2 className="font-semibold">General</h2>
          <div className="space-y-2">
            <label className="text-sm font-medium">Site Name</label>
            <input type="text" value={siteName} onChange={e => setSiteName(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea value={siteDescription} onChange={e => setSiteDescription(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent resize-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tagline</label>
            <input type="text" value={siteTagline} onChange={e => setSiteTagline(e.target.value)} placeholder="Read & Write Stories" className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
          </div>
        </section>

        <section className="p-5 rounded-xl border border-border bg-bg-card space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Globe className="h-4 w-4" /> Branding</h2>

          {/* Favicon Upload & Preview */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Favicon</label>

            <div className="flex items-start gap-4">
              {/* Preview box */}
              <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-bg-input shrink-0 overflow-hidden">
                {faviconUrl ? (
                  <img
                    src={faviconUrl}
                    alt="Favicon preview"
                    className="w-10 h-10 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <img
                    src="/favicon.png"
                    alt="Default favicon"
                    className="w-10 h-10 object-contain"
                  />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <p className="text-xs text-gray-500">
                  {faviconUrl ? 'Custom favicon aktif.' : 'Menggunakan favicon default.'}
                  {' '}Recommended: PNG/ICO 32x32 atau 64x64px.
                </p>

                <div className="flex flex-wrap gap-2">
                  {/* Upload button */}
                  <button
                    type="button"
                    onClick={() => faviconInputRef.current?.click()}
                    disabled={faviconUploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-bg-soft transition-colors disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {faviconUploading ? 'Uploading...' : 'Upload Image'}
                  </button>

                  {/* URL input toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt('Enter favicon URL:', faviconUrl);
                      if (url !== null) setFaviconUrl(url);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-bg-soft transition-colors"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Set URL
                  </button>

                  {/* Reset to default */}
                  {faviconUrl && (
                    <button
                      type="button"
                      onClick={() => setFaviconUrl('')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset to Default
                    </button>
                  )}
                </div>

                {faviconUrl && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-gray-400 font-mono truncate max-w-xs">{faviconUrl}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/png,image/x-icon,image/svg+xml,image/jpeg"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                // Validate file size (max 2MB)
                if (file.size > 2 * 1024 * 1024) {
                  alert('File terlalu besar. Maksimal 2MB.');
                  e.target.value = '';
                  return;
                }

                setFaviconUploading(true);
                try {
                  if (!supabase) throw new Error('Supabase not configured');

                  const ext = file.name.split('.').pop() || 'png';
                  const path = `site/favicon.${ext}`;

                  const { error } = await supabase.storage
                    .from('covers')
                    .upload(path, file, { upsert: true, cacheControl: '0' });

                  if (error) throw error;

                  const { data: urlData } = supabase.storage.from('covers').getPublicUrl(path);
                  // Add cache-busting query param
                  setFaviconUrl(urlData.publicUrl + '?t=' + Date.now());
                } catch (err: any) {
                  alert('Upload gagal: ' + err.message);
                } finally {
                  setFaviconUploading(false);
                  e.target.value = '';
                }
              }}
            />
          </div>
        </section>

        <section className="p-5 rounded-xl border border-border bg-bg-card space-y-4">
          <h2 className="font-semibold">Features</h2>
          <ToggleRow label="Allow Registration" desc="New users can create accounts" value={allowRegistration} onChange={setAllowRegistration} />
          <ToggleRow label="Allow Comments" desc="Users can comment on stories" value={allowComments} onChange={setAllowComments} />
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Stories Per User</label>
            <input type="number" value={maxStoriesPerUser} onChange={e => setMaxStoriesPerUser(parseInt(e.target.value) || 0)} className="w-24 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
          </div>
        </section>

        <section className="p-5 rounded-xl border border-border bg-bg-card space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Heart className="h-4 w-4" /> Donation</h2>
          <ToggleRow label="Enable Donation" desc="Show donation button on story pages" value={donationEnabled} onChange={setDonationEnabled} />
          {donationEnabled && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Available Platforms</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'saweria', label: 'Saweria' },
                  { value: 'trakteer', label: 'Trakteer' },
                  { value: 'sociabuzz', label: 'Sociabuzz' },
                  { value: 'karyakarsa', label: 'KaryaKarsa' },
                  { value: 'custom', label: 'Custom Link' },
                ].map(p => (
                  <label key={p.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={donationPlatforms.includes(p.value)}
                      onChange={e => {
                        if (e.target.checked) setDonationPlatforms([...donationPlatforms, p.value]);
                        else setDonationPlatforms(donationPlatforms.filter(x => x !== p.value));
                      }}
                      className="rounded border-gray-300 text-accent focus:ring-accent"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500">Users will only see these platforms when setting up their donation links.</p>
            </div>
          )}
        </section>

        <section className="p-5 rounded-xl border border-border bg-bg-card space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Globe className="h-4 w-4" /> Social Media Links</h2>
          <p className="text-xs text-gray-500">Tampilkan icon sosial media di footer. Kosongkan URL untuk menyembunyikan icon.</p>
          <div className="space-y-3">
            {[
              { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/username' },
              { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@username' },
              { key: 'twitter', label: 'Twitter / X', placeholder: 'https://twitter.com/username' },
              { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@channel' },
              { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/page' },
            ].map(s => (
              <div key={s.key} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <label className="text-sm font-medium sm:w-24 sm:shrink-0">{s.label}</label>
                <input
                  type="url"
                  value={(socialLinks as any)[s.key]}
                  onChange={e => setSocialLinks(prev => ({ ...prev, [s.key]: e.target.value }))}
                  placeholder={s.placeholder}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-bg-input text-tx border border-border focus:outline-none focus:border-accent"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="p-5 rounded-xl border border-border bg-bg-card space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Key className="h-4 w-4" /> SSO / OAuth Configuration</h2>
          <ToggleRow label="Enable SSO" desc="Allow users to sign in with third-party providers" value={ssoEnabled} onChange={setSsoEnabled} />

          {ssoEnabled && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Provider</label>
                <select value={ssoProvider} onChange={e => setSsoProvider(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-bg-input text-tx border border-border focus:outline-none focus:border-accent [&>option]:bg-bg-card [&>option]:text-tx">
                  <option value="google">Google</option>
                  <option value="github">GitHub</option>
                  <option value="discord">Discord</option>
                  <option value="facebook">Facebook</option>
                  <option value="twitter">Twitter</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Client ID</label>
                <input type="text" value={ssoClientId} onChange={e => setSsoClientId(e.target.value)} placeholder="Your OAuth client ID" className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent font-mono" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Client Secret</label>
                <input type="password" value={ssoClientSecret} onChange={e => setSsoClientSecret(e.target.value)} placeholder="Your OAuth client secret" className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent font-mono" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Callback URL</label>
                <div className="flex gap-2">
                  <input type="text" value={ssoCallbackUrl} onChange={e => setSsoCallbackUrl(e.target.value)} className="flex-1 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent font-mono" readOnly />
                  <button onClick={() => copyToClipboard(ssoCallbackUrl)} className="p-2 rounded-lg border border-border hover:bg-bg-soft transition-colors" title="Copy">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <button onClick={generateCallbackUrl} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-accent text-accent text-sm font-medium hover:bg-accent/10 transition-colors">
                <Key className="h-4 w-4" /> Generate Callback URL
              </button>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs space-y-1">
                <p className="font-medium">Setup Instructions:</p>
                <p>1. Go to your {ssoProvider} developer console</p>
                <p>2. Create a new OAuth application</p>
                <p>3. Set the callback URL to the URL shown above</p>
                <p>4. Copy the Client ID and Client Secret here</p>
                <p>5. Also configure in Supabase Dashboard &gt; Auth &gt; Providers</p>
              </div>
            </>
          )}
        </section>

        <section className="p-5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 space-y-4">
          <h2 className="font-semibold text-red-700 dark:text-red-400">Danger Zone</h2>
          <ToggleRow label="Maintenance Mode" desc="Site will show maintenance page to non-admins" value={maintenanceMode} onChange={setMaintenanceMode} />
        </section>
      </div>

      <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
        <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      <button onClick={() => onChange(!value)} className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-bg-card shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}
