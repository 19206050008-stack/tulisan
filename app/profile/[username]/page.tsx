'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getProfileByUsername, getUserStories, getFollowerCount, getFollowingCount, isFollowing, followUser, unfollowUser, getProfileFrames } from '@/lib/supabase';
import { MapPin, Globe, Calendar, UserPlus, UserMinus, Edit, Eye, Heart, BookOpen } from 'lucide-react';
import { StoryCover } from '@/components/StoryCover';
import { Pagination } from '@/components/Pagination';

export default function PublicProfilePage() {
  const { username } = useParams();
  const { user, role } = useStore();
  const [profile, setProfile] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowed, setIsFollowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [frameSvg, setFrameSvg] = useState<string | null>(null);
  const perPage = 10;

  useEffect(() => {
    loadData();
  }, [username, user]);

  const loadData = async () => {
    setLoading(true);
    const p = await getProfileByUsername(username as string);
    if (p) {
      setProfile(p);
      const [s, fc, fgc] = await Promise.all([
        getUserStories(p.id),
        getFollowerCount(p.id),
        getFollowingCount(p.id)
      ]);
      setStories(s);
      setFollowers(fc);
      setFollowing(fgc);
      if (user?.id && user.id !== p.id) {
        const f = await isFollowing(user.id, p.id);
        setIsFollowed(f);
      }
      // Load profile frame
      if (p.frame_id) {
        const frames = await getProfileFrames();
        const frame = frames.find((f: any) => f.id === p.frame_id);
        setFrameSvg(frame?.svg_data || null);
      } else {
        setFrameSvg(null);
      }
    }
    setLoading(false);
  };

  const handleFollow = async () => {
    if (!user?.id || !profile) return;
    if (isFollowed) {
      await unfollowUser(user.id, profile.id);
      setIsFollowed(false);
      setFollowers(f => f - 1);
    } else {
      await followUser(user.id, profile.id);
      setIsFollowed(true);
      setFollowers(f => f + 1);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-500">Loading...</div>;
  }

  if (!profile) {
    return <div className="text-center py-16 text-gray-500">User not found.</div>;
  }

  const isOwn = user?.id === profile.id;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row items-start gap-6">
        <div className="shrink-0 relative w-28 h-28">
          {frameSvg && (
            <div className="absolute inset-[-6px] w-[124px] h-[124px] z-10 pointer-events-none" dangerouslySetInnerHTML={{ __html: frameSvg.replace('<svg', '<svg width="100%" height="100%"') }} />
          )}
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username} className="w-28 h-28 rounded-full object-cover" />
          ) : (
            <div className="w-28 h-28 rounded-full bg-bg-input flex items-center justify-center text-4xl font-bold text-gray-400">
              {(profile.full_name || profile.username)?.[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-2xl font-bold">{profile.full_name || profile.username}</h1>
            <span className="text-gray-500">@{profile.username}</span>
            {isOwn ? (
              <Link href="/profile/edit" className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-full border border-border hover:bg-bg-soft transition-colors">
                <Edit className="h-3.5 w-3.5" /> Edit Profile
              </Link>
            ) : role !== 'guest' && (
              <button onClick={handleFollow} className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-full transition-colors ${isFollowed ? 'border border-border hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-200' : 'bg-accent text-white hover:opacity-90'}`}>
                {isFollowed ? <><UserMinus className="h-3.5 w-3.5" /> Unfollow</> : <><UserPlus className="h-3.5 w-3.5" /> Follow</>}
              </button>
            )}
          </div>

          {profile.bio && <p className="text-tx-soft">{profile.bio}</p>}

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {profile.location && (
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {profile.location}</span>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent hover:underline"><Globe className="h-4 w-4" /> {profile.website.replace(/https?:\/\//, '')}</a>
            )}
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Joined {new Date(profile.created_at).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <span><strong>{stories.length}</strong> Stories</span>
            <span><strong>{followers}</strong> Followers</span>
            <span><strong>{following}</strong> Following</span>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-bold font-serif flex items-center gap-2"><BookOpen className="h-5 w-5" /> Published Stories</h2>
        {stories.length === 0 ? (
          <p className="text-gray-500 text-sm">No published stories yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {stories.slice((currentPage - 1) * perPage, currentPage * perPage).map(story => (
                <Link href={`/story/${story.id}`} key={story.id} className="group space-y-2">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-bg-input">
                    <StoryCover coverUrl={story.cover_url} category={story.category} title={story.title} className="transition-transform group-hover:scale-105" />
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-accent transition-colors">{story.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {story.reads_count || 0}</span>
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {story.likes_count || 0}</span>
                  </div>
                </Link>
              ))}
            </div>
            {Math.ceil(stories.length / perPage) > 1 && (
              <Pagination currentPage={currentPage} totalPages={Math.ceil(stories.length / perPage)} onPageChange={setCurrentPage} />
            )}
          </>
        )}
      </section>
    </div>
  );
}
