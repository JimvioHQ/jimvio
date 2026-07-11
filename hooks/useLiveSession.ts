"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type LiveParticipant = {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
};

export type LiveSignal = {
  id: string;
  session_id: string;
  from_user_id: string;
  to_user_id: string | null;
  signal_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type PeerConnection = {
  userId: string;
  pc: RTCPeerConnection;
  stream?: MediaStream;
};

export function useLiveSession(sessionId: string) {
  const supabase = createClientComponentClient();
  
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isJoined, setIsJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<Map<string, PeerConnection>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const iceQueueRef = useRef<Map<string, RTCIceCandidate[]>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const isProcessingSignal = useRef(false);

  const STUN_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  const createPeerConnection = useCallback((targetUserId: string) => {
    const pc = new RTCPeerConnection(STUN_SERVERS);

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.set(targetUserId, stream);
        return next;
      });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(targetUserId, "ice-candidate", { candidate: event.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        removePeerConnection(targetUserId);
      }
    };

    pcRef.current.set(targetUserId, { userId: targetUserId, pc });
    return pc;
  }, [localStream]);

  const removePeerConnection = useCallback((userId: string) => {
    const peer = pcRef.current.get(userId);
    if (peer) {
      peer.pc.close();
      pcRef.current.delete(userId);
    }
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
    iceQueueRef.current.delete(userId);
  }, []);

  const sendSignal = useCallback(
    async (toUserId: string, signalType: string, payload: Record<string, unknown>) => {
      try {
        await fetch(`/api/c/live/${sessionId}/signals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to_user_id: toUserId, signal_type, payload }),
        });
      } catch (err) {
        console.error("Failed to send signal:", err);
      }
    },
    [sessionId]
  );

  const broadcastSignal = useCallback(
    async (signalType: string, payload: Record<string, unknown>) => {
      try {
        await fetch(`/api/c/live/${sessionId}/signals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signal_type, payload }),
        });
      } catch (err) {
        console.error("Failed to broadcast signal:", err);
      }
    },
    [sessionId]
  );

  const handleSignal = useCallback(
    async (signal: LiveSignal) => {
      if (signal.from_user_id === (await supabase.auth.getUser()).data.user?.id) return;

      if (isProcessingSignal.current) return;
      isProcessingSignal.current = true;

      try {
        if (signal.signal_type === "join") {
          await createPeerConnection(signal.from_user_id);
          const offer = await pcRef.current.get(signal.from_user_id)!.pc.createOffer();
          await pcRef.current.get(signal.from_user_id)!.pc.setLocalDescription(offer);
          await sendSignal(signal.from_user_id, "offer", { sdp: offer });
        } else if (signal.signal_type === "offer") {
          let peer = pcRef.current.get(signal.from_user_id);
          if (!peer) {
            peer = createPeerConnection(signal.from_user_id);
          }
          const pc = peer.pc;
          await pc.setRemoteDescription(new RTCSessionDescription(signal.payload.sdp as RTCSessionDescriptionInit));
          
          for (const candidate of iceQueueRef.current.get(signal.from_user_id) || []) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          iceQueueRef.current.delete(signal.from_user_id);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal(signal.from_user_id, "answer", { sdp: answer });
        } else if (signal.signal_type === "answer") {
          const peer = pcRef.current.get(signal.from_user_id);
          if (peer) {
            await peer.pc.setRemoteDescription(new RTCSessionDescription(signal.payload.sdp as RTCSessionDescriptionInit));
          }
        } else if (signal.signal_type === "ice-candidate") {
          const peer = pcRef.current.get(signal.from_user_id);
          if (peer && peer.pc.remoteDescription) {
            await peer.pc.addIceCandidate(new RTCIceCandidate(signal.payload.candidate as RTCIceCandidateInit));
          } else {
            const queue = iceQueueRef.current.get(signal.from_user_id) || [];
            queue.push(signal.payload.candidate as RTCIceCandidateInit);
            iceQueueRef.current.set(signal.from_user_id, queue);
          }
        } else if (signal.signal_type === "leave") {
          removePeerConnection(signal.from_user_id);
        }
      } catch (err) {
        console.error("Signal handling error:", err);
      } finally {
        isProcessingSignal.current = false;
      }
    },
    [supabase, createPeerConnection, removePeerConnection, sendSignal]
  );

  const fetchParticipants = useCallback(async () => {
    const { data, error } = await supabase
      .from("live_session_participants")
      .select(`
        *,
        user:profiles!user_id (id, full_name, avatar_url, username)
      `)
      .eq("session_id", sessionId)
      .is("left_at", null)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch participants:", error);
      return;
    }

    setParticipants(data || []);
    
    const { data: { user } } = await supabase.auth.getUser();
    const host = data?.find(p => p.role === "host");
    setIsHost(host?.user_id === user?.id);
  }, [supabase, sessionId]);

  const joinSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/c/live/${sessionId}/join`, { method: "POST" });
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
        return false;
      }

      setIsJoined(true);
      await fetchParticipants();
      return true;
    } catch (err) {
      setError("Failed to join session");
      return false;
    }
  }, [sessionId, fetchParticipants]);

  const leaveSession = useCallback(async () => {
    await fetch(`/api/c/live/${sessionId}/leave`, { method: "POST" });
    setIsJoined(false);
    setParticipants([]);
    
    pcRef.current.forEach((peer) => {
      peer.pc.close();
    });
    pcRef.current.clear();
    setRemoteStreams(new Map());
    
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
  }, [sessionId, localStream]);

  const startStreaming = useCallback(async (video = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video,
      });
      
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      pcRef.current.forEach((peer) => {
        stream.getTracks().forEach((track) => {
          const sender = peer.pc.getSenders().find(s => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          } else {
            peer.pc.addTrack(track, stream);
          }
        });
      });

      await broadcastSignal("join", { video });
      return true;
    } catch (err) {
      console.error("Failed to start streaming:", err);
      setError("Failed to access camera/microphone");
      return false;
    }
  }, [broadcastSignal]);

  const stopStreaming = useCallback(async () => {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    await broadcastSignal("leave", {});
  }, [localStream, broadcastSignal]);

  useEffect(() => {
    const channel = supabase
      .channel(`live-session:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_session_signals",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          handleSignal(payload.new as LiveSignal);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_session_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new.user_id !== (supabase.auth.getUser()).data.user?.id) {
            fetchParticipants();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_session_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    channelRef.current = channel;

    fetchParticipants();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [sessionId, supabase, handleSignal, fetchParticipants]);

  return {
    participants,
    localStream,
    remoteStreams,
    isJoined,
    isHost,
    error,
    localVideoRef,
    joinSession,
    leaveSession,
    startStreaming,
    stopStreaming,
    fetchParticipants,
  };
}