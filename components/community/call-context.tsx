"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Phone, Video, X } from "lucide-react";
import { useWorkspace } from "@/components/community/workspace-context";

type CallType = 'audio' | 'video' | 'call_signal';

interface CallProviderProps {
  children: React.ReactNode;
}

interface IncomingCall {
  type: 'audio' | 'video';
  sender: any;
  roomId?: string;
  convId?: string;
}

const CallContext = createContext<{
  callType: 'audio' | 'video' | null;
  setCallType: (t: 'audio' | 'video' | null) => void;
  incomingCall: IncomingCall | null;
  setIncomingCall: (c: IncomingCall | null) => void;
  startCall: (type: 'audio' | 'video', roomId?: string, convId?: string) => Promise<void>;
  endCall: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  pcRef: React.MutableRefObject<RTCPeerConnection | null>;
  iceQueueRef: React.MutableRefObject<RTCIceCandidateInit[]>;
} | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

export function CallProvider({ children }: CallProviderProps) {
  const { communityId, userId, slug } = useWorkspace();
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const supabase = createClient();

  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const callingToneRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create Audio elements for tones
    ringtoneRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3"); // Incoming
    ringtoneRef.current.loop = true;
    callingToneRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2855/2855-preview.mp3"); // Outgoing
    callingToneRef.current.loop = true;

    return () => {
       ringtoneRef.current?.pause();
       callingToneRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (incomingCall) ringtoneRef.current?.play().catch(() => {});
    else ringtoneRef.current?.pause();
  }, [incomingCall]);

  useEffect(() => {
    if (callType && !remoteStream) callingToneRef.current?.play().catch(() => {});
    else callingToneRef.current?.pause();
  }, [callType, remoteStream]);

  // Global call listener
  useEffect(() => {
     if (!userId || !communityId) return;
     
     // Listen for ANY message_type 'call_start' or 'call_signal' in the community
     // This is a broad listener that works if the user is anywhere in the community workspace
     const ch = supabase.channel(`community_calls:${communityId}`)
       .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `community_id=eq.${communityId}` },
         async (payload:any) => {
           if (payload.new.message_type === 'call_start' && payload.new.sender_id !== userId) {
             const { data: prof } = await supabase.from('profiles').select('full_name, avatar_url, username').eq('id', payload.new.sender_id).single();
             setIncomingCall({
               type: payload.new.body === 'video' ? 'video' : 'audio',
               sender: prof,
               roomId: payload.new.room_id
             });
           } else if (payload.new.message_type === 'call_signal' && payload.new.sender_id !== userId) {
             handleCallSignal(JSON.parse(payload.new.body));
           }
         }
       )
       .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_inbox_messages' },
         async (payload:any) => {
           // We need to verify if this inbox message belongs to a conversation involving the current user
           const { data: conv } = await supabase.from('community_inbox_conversations')
             .select('user_low, user_high')
             .eq('id', payload.new.conversation_id)
             .single();
           
           if (conv && (conv.user_low === userId || conv.user_high === userId) && payload.new.message_type === 'call_start' && payload.new.sender_id !== userId) {
             const { data: prof } = await supabase.from('profiles').select('full_name, avatar_url, username').eq('id', payload.new.sender_id).single();
             setIncomingCall({
               type: payload.new.body === 'video' ? 'video' : 'audio',
               sender: prof,
               convId: payload.new.conversation_id
             });
           } else if (conv && (conv.user_low === userId || conv.user_high === userId) && payload.new.message_type === 'call_signal' && payload.new.sender_id !== userId) {
             handleCallSignal(JSON.parse(payload.new.body));
           }
         }
       )
       .subscribe();

     return () => { supabase.removeChannel(ch); };
  }, [userId, communityId]);

  async function sendSignal(type: string, bodyContent: any, targetRoom?: string, targetConv?: string) {
    const endpoint = targetConv 
      ? `/api/communities/${slug}/inbox/${targetConv}/messages`
      : `/api/messages/${targetRoom}`;
    
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        body: typeof bodyContent === 'object' ? JSON.stringify(bodyContent) : bodyContent, 
        message_type: type
      }),
    });
  }

  async function initWebRTC(type: 'audio'|'video', isInitiator: boolean, rId?: string, cId?: string) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      setLocalStream(stream);
      
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pcRef.current = pc;
      
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pc.ontrack = (ev) => setRemoteStream(ev.streams[0]);
      pc.onicecandidate = (ev) => {
        if (ev.candidate) sendSignal('call_signal', { ice: ev.candidate }, rId, cId);
      };

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal('call_signal', { sdp: offer }, rId, cId);
      }
    } catch (err) {
      console.error("WebRTC Init Error:", err);
    }
  }

  async function handleCallSignal(signal: any) {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      if (signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        for (const cand of iceQueueRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
        iceQueueRef.current = [];

        if (signal.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal('call_signal', { sdp: answer }, incomingCall?.roomId, incomingCall?.convId);
        }
      } else if (signal.ice) {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(() => {});
        } else {
          iceQueueRef.current.push(signal.ice);
        }
      }
    } catch (e) { console.error("Signal Error:", e); }
  }

  async function startCall(type: 'audio' | 'video', rId?: string, cId?: string) {
    setCallType(type);
    iceQueueRef.current = [];
    await sendSignal('call_start', type, rId, cId);
    await initWebRTC(type, true, rId, cId);
  }

  function endCall() {
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null); setRemoteStream(null); setCallType(null);
    pcRef.current?.close(); pcRef.current = null;
    iceQueueRef.current = [];
    callingToneRef.current?.pause();
    ringtoneRef.current?.pause();
  }

  return (
    <CallContext.Provider value={{
      callType, setCallType,
      incomingCall, setIncomingCall,
      startCall, endCall,
      localStream, remoteStream,
      pcRef, iceQueueRef
    }}>
      {children}
      
      {/* Global Incoming Call UI */}
      {incomingCall && (
        <div className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-black/90 text-white animate-in fade-in zoom-in duration-300">
           <div className="flex flex-col items-center gap-6 max-w-sm w-full p-8 rounded-none bg-[#233138] border border-white/10 shadow-none">
              <div className="w-24 h-24 rounded-none bg-[#00a884] flex items-center justify-center text-3xl font-bold overflow-hidden shadow-none">
                {incomingCall.sender?.avatar_url ? <img src={incomingCall.sender.avatar_url} className="w-full h-full object-cover" alt=""/> : <span>{incomingCall.sender?.full_name?.[0] || 'I'}</span>}
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold">{incomingCall.sender?.full_name || incomingCall.sender?.username || 'Someone'}</h3>
                <p className="text-[#00a884] font-bold mt-1 uppercase tracking-widest text-[11px]">Incoming {incomingCall.type} Call...</p>
              </div>
              <div className="flex items-center gap-12 mt-4">
                <button onClick={() => { endCall(); setIncomingCall(null); }} className="w-14 h-14 rounded-none bg-red-500 flex items-center justify-center hover:bg-red-600 transition-all active:scale-90 shadow-none">
                  <X className="h-6 w-6" />
                </button>
                <button 
                  onClick={() => { 
                    const type = incomingCall.type;
                    const rId = incomingCall.roomId;
                    const cId = incomingCall.convId;
                    setIncomingCall(null); 
                    setCallType(type);
                    initWebRTC(type, false, rId, cId); 
                  }} 
                  className="w-16 h-16 rounded-none bg-[#00a884] flex items-center justify-center hover:bg-[#008069] transition-all active:scale-95 shadow-none animate-bounce"
                >
                  {incomingCall.type === 'audio' ? <Phone className="h-7 w-7" /> : <Video className="h-7 w-7" />}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Global Active Call UI */}
      {callType && (
        <div className="fixed inset-0 z-[99999] bg-[#0b141a] flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-8 duration-500">
           <div className="absolute top-12 flex flex-col items-center gap-2">
             <div className="w-16 h-16 rounded-none bg-[#233138] flex items-center justify-center shadow-none overflow-hidden border border-white/5">
                {incomingCall?.sender?.avatar_url ? <img src={incomingCall.sender.avatar_url} className="w-full h-full object-cover" alt=""/> : <Phone className="h-8 w-8 text-[#8696a0]" />}
             </div>
             <h2 className="text-2xl font-bold text-white mt-4">{incomingCall?.sender?.full_name || 'Calling...'}</h2>
             <p className="text-[#8696a0]">{remoteStream ? 'Connected' : 'Secure Signal...'}</p>
           </div>
           
           <div className="w-full max-w-4xl h-[60vh] bg-[#233138] rounded-none overflow-hidden shadow-none border border-white/10 mt-20 relative group">
                <video autoPlay playsInline id="remoteVideo" 
                   ref={(el) => { if(el && remoteStream) el.srcObject = remoteStream; }}
                   className="w-full h-full object-cover" />
                
                <video autoPlay playsInline muted id="localVideo"
                   ref={(el) => { if(el && localStream) el.srcObject = localStream; }}
                   className={`absolute bottom-6 right-6 w-32 h-48 bg-black rounded-none border border-white/20 object-cover transition-transform group-hover:scale-105 shadow-none ${!remoteStream ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-72' : ''}`} />

                <div className="absolute top-6 left-6 px-4 py-1.5 bg-black/40 rounded-none border border-white/10 flex items-center gap-2">
                   <div className="w-2 h-2 bg-[#00a884] rounded-none animate-pulse" />
                   <p className="text-[10px] text-[#00a884] font-black uppercase tracking-[0.2em]">P2P SECURE</p>
                </div>
           </div>

           <div className="flex items-center gap-16 mt-16">
              <button 
                onClick={() => endCall()} 
                className="w-16 h-16 rounded-none bg-red-500 flex items-center justify-center hover:bg-red-600 transition-all active:scale-90 shadow-none"
              >
                <Phone className="h-8 w-8 rotate-[135deg] text-white" />
              </button>
           </div>
        </div>
      )}
    </CallContext.Provider>
  );
}

