"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  X, Heart, MessageCircle, Share2, Play, Pause, 
  Volume2, VolumeX, ChevronUp, ChevronDown, UserPlus, Music2,
  Bookmark, ChevronRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleFollowVendor, getFollowStatus } from "@/lib/actions/marketplace";
import { toast } from "sonner";

interface Clip {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string;
  total_views?: number;
  total_shares?: number;
  vendors?: { id: string; business_name: string; logo_url?: string };
}

interface ViralStoryRowProps {
  clips: Clip[];
  initialActiveIndex?: number | null;
  onClose?: () => void;
  forceOpen?: boolean;
  /** When false, only the story row is shown (no "Live Viral Drops / Active Now" header). Use when hero has its own badge. */
  showHeader?: boolean;
}

export function ViralStoryRow({ clips, initialActiveIndex = null, onClose, forceOpen = false, showHeader = true }: ViralStoryRowProps) {
  const [activeClipIndex, setActiveClipIndex] = useState<number | null>(initialActiveIndex);
  const [isMuted, setIsMuted] = useState(true);
  const [followedVendors, setFollowedVendors] = useState<Record<string, boolean>>({});
  const [isFollowing, setIsFollowing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (forceOpen && initialActiveIndex !== null) {
      setActiveClipIndex(initialActiveIndex);
      document.body.style.overflow = "hidden";
    }
  }, [forceOpen, initialActiveIndex]);
  
  const openPlayer = async (index: number) => {
    setActiveClipIndex(index);
    document.body.style.overflow = "hidden";
    
    // Check follow status when opening player
    const vendorId = clips[index].vendors?.id;
    if (vendorId && followedVendors[vendorId] === undefined) {
      const status = await getFollowStatus(vendorId);
      setFollowedVendors(prev => ({ ...prev, [vendorId]: status }));
    }
  };

  const handleFollow = async (e: React.MouseEvent, vendorId: string) => {
    e.stopPropagation();
    setIsFollowing(true);
    const res = await toggleFollowVendor(vendorId);
    setIsFollowing(false);

    if (res.success) {
      setFollowedVendors(prev => ({ ...prev, [vendorId]: res.action === "followed" }));
      toast.success(res.action === "followed" ? "Followed store!" : "Unfollowed store.");
    } else {
      if (res.error === "Authentication required") {
        toast.error("Please sign in to follow stores.");
        router.push("/login?returnUrl=" + encodeURIComponent(window.location.pathname));
      } else {
        toast.error(res.error || "Failed to follow");
      }
    }
  };

  const closePlayer = () => {
    setActiveClipIndex(null);
    document.body.style.overflow = "auto";
    if (onClose) onClose();
  };

  if (!clips || clips.length === 0) return null;

  return (
    <>
      {!forceOpen && (
        <div className="w-full">
          {showHeader && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#f97316] to-[#7c2d12] flex items-center justify-center p-0.5">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <Play className="h-3 w-3 text-[#f97316] fill-[#f97316]" />
                    </div>
                  </div>
                </div>
                <h2 className="text-[13px] font-black text-text-primary tracking-widest capitalize">Live Viral Drops</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-[#9ca3af] font-black capitalize tracking-widest">Active Now</span>
              </div>
            </div>
          )}
          {/* Story row */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
            {clips.map((clip, index) => (
              <div 
                key={clip.id}
                onClick={() => openPlayer(index)}
                className="relative min-w-[110px] md:min-w-[130px] h-[160px] md:h-[190px] rounded-xl overflow-hidden cursor-pointer group shadow-md hover:shadow-xl transition-all active:scale-95 flex-shrink-0"
              >
                {/* Background / Video Preview */}
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{ 
                    backgroundImage: clip.thumbnail_url 
                      ? `url(${clip.thumbnail_url})` 
                      : `linear-gradient(to bottom, var(--color-bg-dark), #431407)` 
                  }}
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-ink-darker/25 via-transparent to-ink-darker/85" />
                
                {/* Top Avatar */}
                <div className="absolute top-3 left-3 z-10">
                  <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-[#f97316] to-[#7c2d12] shadow-lg">
                    <Avatar className="w-full h-full border-2 border-white">
                      <AvatarImage src={clip.vendors?.logo_url} />
                      <AvatarFallback className="text-[10px] font-black bg-[#f97316] text-white">
                        {clip.vendors?.business_name?.[0] || 'V'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                
                {/* Bottom Info */}
                <div className="absolute bottom-3 left-3 right-3 z-10">
                  <p className="text-white text-[12px] font-black line-clamp-2 leading-tight drop-shadow-lg mb-1">{clip.title}</p>
                  <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
                     <span className="text-[10px] text-white/80 font-bold capitalize tracking-widest">{clip.total_views?.toLocaleString() || '1.2K'} views</span>
                  </div>
                </div>

                {/* Play Badge */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                    <Play className="h-6 w-6 text-white fill-white" />
                  </div>
                </div>
              </div>
            ))}
            
            {/* Become a Creator Card */}
            <div className="relative min-w-[110px] md:min-w-[130px] h-[160px] md:h-[190px] rounded-xl overflow-hidden cursor-pointer group border-2 border-dashed border-[#f97316]/20 bg-[#fff7ed] flex flex-col items-center justify-center text-center p-3 hover:border-[#f97316] transition-all flex-shrink-0">
               <div className="w-8 h-8 rounded-lg bg-[#f97316] text-white flex items-center justify-center mb-2 shadow-lg group-hover:scale-110 transition-transform">
                 <UserPlus className="h-4 w-4" />
               </div>
               <p className="text-[9px] font-black text-[#f97316] capitalize tracking-widest leading-tight">Post Clip</p>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen TikTok Style Player */}
      {activeClipIndex !== null && (
        <div className="fixed inset-0 z-[1000] bg-ink-dark flex items-center justify-center animate-in fade-in duration-300">
          <div className="relative w-full max-w-[500px] bg-ink-darker overflow-hidden sm:rounded-3xl shadow-2xl flex flex-col h-screen sm:h-[90vh]">
            
            {/* Close Button */}
            <button 
              onClick={closePlayer}
              className="absolute top-6 right-6 z-[1100] w-10 h-10 rounded-full bg-ink-darker/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Video Player Area */}
            <div className="flex-1 relative bg-ink-dark flex items-center justify-center overflow-hidden">
               {/* Video Element Placeholder (using iframe for demo if it's YouTube, or Video tag) */}
               <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="w-full h-full relative group">
                    {/* Dark gradient top/bottom for readability */}
                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink-darker/60 to-transparent z-10 pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-ink-darker/80 via-ink-darker/25 to-transparent z-10 pointer-events-none" />

                    {/* Simulation of a vertical video */}
                    {clips[activeClipIndex].video_url.includes('youtube.com') || clips[activeClipIndex].video_url.includes('youtu.be') ? (
                      <iframe 
                        src={`${clips[activeClipIndex].video_url.replace('watch?v=', 'embed/')}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&controls=0`}
                        className="w-full h-full pointer-events-none scale-[2.5]"
                        allow="autoplay"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-ink-dark flex items-center justify-center">
                         <div className="text-center p-8">
                           <Video className="h-20 w-20 text-white/10 mx-auto mb-4" />
                           <p className="text-white/40 font-black capitalize text-[12px] tracking-widest">{clips[activeClipIndex].title}</p>
                           <p className="text-white/20 text-[10px] mt-2 italic">Video rendering via {clips[activeClipIndex].video_url}</p>
                         </div>
                      </div>
                    )}

                    <div className="absolute inset-0 z-20" onClick={() => {/* Toggle Pause */}} />

                    {/* Mute Toggle */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                      className="absolute top-6 left-6 z-30 w-10 h-10 rounded-full bg-ink-darker/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white"
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                    
                    {/* Navigation Arrows (Mobile uses Swipe, Desktop uses Arrows) */}
                     <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-40">
                       <div className="flex flex-col items-center gap-1 group/btn">
                          <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-[#f97316] transition-all">
                             <Heart className="h-6 w-6" />
                          </button>
                          <span className="text-white text-[12px] font-black drop-shadow-lg">
                            {((clips[activeClipIndex].total_views || 0) * 0.42).toFixed(1)}K
                          </span>
                       </div>
                       <div className="flex flex-col items-center gap-1 group/btn">
                          <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-[#f97316] transition-all">
                             <MessageCircle className="h-6 w-6" />
                          </button>
                          <span className="text-white text-[12px] font-black drop-shadow-lg">
                            {((clips[activeClipIndex].total_views || 0) * 0.08).toFixed(1)}K
                          </span>
                       </div>
                       <div className="flex flex-col items-center gap-1 group/btn">
                          <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-[#f97316] transition-all">
                             <Bookmark className="h-6 w-6" />
                          </button>
                          <span className="text-white text-[12px] font-black drop-shadow-lg">
                            {((clips[activeClipIndex].total_views || 0) * 0.15).toFixed(0)}
                          </span>
                       </div>
                       <div className="flex flex-col items-center gap-1 group/btn">
                          <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-[#f97316] transition-all">
                             <Share2 className="h-6 w-6" />
                          </button>
                          <span className="text-white text-[12px] font-black drop-shadow-lg">
                            {clips[activeClipIndex].total_shares || 0}
                          </span>
                       </div>
                    </div>

                    {/* Bottom Info Overlay */}
                    <div className="absolute bottom-10 left-6 right-20 z-40 text-white">
                       <div className="flex items-center gap-3 mb-4">
                          <Avatar className="h-10 w-10 border-2 border-[#f97316]">
                             <AvatarImage src={clips[activeClipIndex].vendors?.logo_url} />
                             <AvatarFallback className="bg-[#f97316] text-white">{clips[activeClipIndex].vendors?.business_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                             <h4 className="text-[15px] font-black leading-none">{clips[activeClipIndex].vendors?.business_name || "Premium Supplier"}</h4>
                             <p className="text-[11px] text-white/60 font-medium">@jimvio_creator_hub</p>
                          </div>
                           <button 
                             disabled={isFollowing}
                             onClick={(e) => clips[activeClipIndex].vendors?.id && handleFollow(e, clips[activeClipIndex].vendors.id)}
                             className={cn(
                               "ml-2 px-4 py-1.5 rounded-full text-[12px] font-black transition-all",
                               followedVendors[clips[activeClipIndex].vendors?.id || ""] 
                                 ? "bg-white/10 text-white border border-white/20 hover:bg-white/20" 
                                 : "bg-[#f97316] text-white hover:bg-[#ea580c]"
                             )}
                           >
                              {isFollowing ? "..." : followedVendors[clips[activeClipIndex].vendors?.id || ""] ? "Following" : "Follow"}
                           </button>
                       </div>
                       <p className="text-[15px] font-bold leading-relaxed mb-4 line-clamp-3">{clips[activeClipIndex].title}</p>
                       <div className="flex items-center gap-2 bg-ink-darker/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 w-fit">
                          <Music2 className="h-3 w-3 animate-spin-slow" />
                          <span className="text-[11px] font-bold text-white/80">
                            {clips[activeClipIndex].vendors?.business_name || "Creators"} - Live Pulse
                          </span>
                       </div>
                    </div>

                    {/* Scrolling Controls */}
                    <div className="absolute bottom-6 right-6 z-50 flex flex-col gap-2">
                       <button 
                        onClick={() => setActiveClipIndex((activeClipIndex - 1 + clips.length) % clips.length)}
                        className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-[#f97316] transition-all"
                       >
                         <ChevronUp className="h-6 w-6" />
                       </button>
                       <button 
                         onClick={() => setActiveClipIndex((activeClipIndex + 1) % clips.length)}
                         className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-[#f97316] transition-all"
                       >
                         <ChevronDown className="h-6 w-6" />
                       </button>
                    </div>

                  </div>
               </div>
            </div>

            {/* Progress Bar (TikTok style) */}
            <div className="h-1 w-full bg-white/20">
               <div className="h-full bg-[#f97316] w-2/3 animate-progress" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Video({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11" />
      <rect width="14" height="12" x="2" y="6" rx="2" />
    </svg>
  );
}
