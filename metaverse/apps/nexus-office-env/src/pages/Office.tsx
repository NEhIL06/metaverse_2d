/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertCircle,
  X,
  MessageSquare,
  PhoneCall,
  PhoneOff,
  LogOut,
  Users,
  Wifi,
  Sparkles,
  Compass,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { spaceAPI } from '@/lib/api';
import { Input } from '@/components/ui/input';
import PeerService from './service/peer';
import { useOfficeStore } from '@/store/officeStore';

// ── Color generator for user avatars ──────────────────────────────
function getUserStyle(userId: string) {
  const palette = [
    { bg: '#10b981', border: '#047857', glow: 'rgba(16, 185, 129, 0.45)' }, // Emerald
    { bg: '#8b5cf6', border: '#6d28d9', glow: 'rgba(139, 92, 246, 0.45)' }, // Violet
    { bg: '#f59e0b', border: '#b45309', glow: 'rgba(245, 158, 11, 0.45)' }, // Amber
    { bg: '#06b6d4', border: '#0e7490', glow: 'rgba(6, 182, 212, 0.45)' },  // Cyan
    { bg: '#ec4899', border: '#be185d', glow: 'rgba(236, 72, 153, 0.45)' }, // Pink
    { bg: '#3b82f6', border: '#1d4ed8', glow: 'rgba(59, 130, 246, 0.45)' }, // Blue
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

const Office = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const miniMapRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');

  // Position interpolation refs for smooth animation
  const posMapRef = useRef<Map<string, { currentX: number; currentY: number; targetX: number; targetY: number }>>(
    new Map()
  );
  const myPosRef = useRef<{ currentX: number; currentY: number; targetX: number; targetY: number }>({
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0,
  });

  // ── Office store ──────────────────────────────────────────────────
  const {
    arenaWidth,
    arenaHeight,
    setArenaDimensions,
    currentUser,
    setCurrentUser,
    updateCurrentUserPos,
    users,
    upsertUser,
    removeUser,
    updateUserPos,
    messages,
    addMessage,
    inCallWith,
    setInCallWith,
    localStream,
    setLocalStream,
    remoteStream,
    setRemoteStream,
    wsConnected,
    setWsConnected,
    resetOffice,
  } = useOfficeStore();

  const token = localStorage.getItem('token') || '';
  const webSocketUrl = import.meta.env.VITE_WS_URL;
  const proximityThreshold = 3;

  function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  // ── WebSocket + space dims init ───────────────────────────────────
  useEffect(() => {
    if (!webSocketUrl || !spaceId) return;

    spaceAPI
      .getById(spaceId)
      .then((sp: any) => {
        if (sp?.dimensions) {
          const parts = String(sp.dimensions).split('x').map((s: string) => s.trim());
          setArenaDimensions(Number(parts[0]) || arenaWidth, Number(parts[1]) || arenaHeight);
        }
      })
      .catch((err: any) => console.error('Error fetching space:', err));

    const ws = new WebSocket(webSocketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      localStorage.setItem('activeSpaceId', spaceId);
      const savedPosStr = localStorage.getItem(`office_pos_${spaceId}`);
      let savedPos: { x?: number; y?: number } | null = null;
      try {
        if (savedPosStr) savedPos = JSON.parse(savedPosStr);
      } catch (_e) { /* ignore */ }

      ws.send(
        JSON.stringify({
          type: 'join',
          payload: {
            spaceId,
            token,
            x: savedPos?.x,
            y: savedPos?.y,
          },
        })
      );
    };

    ws.onmessage = (ev: MessageEvent) => {
      try {
        handleWsMessage(JSON.parse(ev.data));
      } catch (err) {
        console.error('invalid ws message', err);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      console.log('websocket closed');
    };

    ws.onerror = (e) => console.error('ws error', e);

    return () => {
      ws.close();
      wsRef.current = null;
      resetOffice();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, webSocketUrl]);

  // ── Sync user positions into interpolation refs ───────────────────
  useEffect(() => {
    if (currentUser && typeof currentUser.x === 'number') {
      if (myPosRef.current.targetX === 0 && myPosRef.current.targetY === 0) {
        myPosRef.current.currentX = currentUser.x;
        myPosRef.current.currentY = currentUser.y;
      }
      myPosRef.current.targetX = currentUser.x;
      myPosRef.current.targetY = currentUser.y;
    }

    users.forEach((u, uId) => {
      const existing = posMapRef.current.get(uId);
      if (!existing) {
        posMapRef.current.set(uId, {
          currentX: u.x,
          currentY: u.y,
          targetX: u.x,
          targetY: u.y,
        });
      } else {
        existing.targetX = u.x;
        existing.targetY = u.y;
      }
    });

    posMapRef.current.forEach((_, key) => {
      if (!users.has(key)) posMapRef.current.delete(key);
    });
  }, [currentUser, users]);

  // ── Proximity → auto-call ─────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.userId) return;
    users.forEach((user) => {
      if (inCallWith === user.userId) return;
      if (String(user.userId) === String(currentUser.userId)) return;
      if (distanceBetween(currentUser as any, user) <= proximityThreshold) {
        const myId = String(currentUser.userId);
        const otherId = String(user.userId);
        if (myId < otherId) startCall(otherId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, currentUser, inCallWith]);

  // ── WS message handler ────────────────────────────────────────────
  const handleWsMessage = (message: any) => {
    if (!message?.type) return;
    switch (message.type) {
      case 'space-joined': {
        try {
          const spawnX = Number(message.payload?.spawn?.x ?? Math.floor(arenaWidth / 2));
          const spawnY = Number(message.payload?.spawn?.y ?? Math.floor(arenaHeight / 2));
          const userId = message.payload?.userId;
          setCurrentUser({ x: spawnX, y: spawnY, userId });
          myPosRef.current = { currentX: spawnX, currentY: spawnY, targetX: spawnX, targetY: spawnY };
          toast({ title: 'Welcome to Office', description: `Connected to Space #${spaceId?.substring(0, 8)}` });

          (message.payload?.users ?? []).forEach((u: any) => {
            if (!u?.userId || String(u.userId) === String(userId)) return;
            upsertUser({ userId: String(u.userId), x: Number(u.x) || 0, y: Number(u.y) || 0 });
          });
        } catch (e) {
          console.error('space-joined handling error', e);
        }
        break;
      }

      case 'user-joined': {
        const { userId, x, y } = message.payload;
        upsertUser({ userId: String(userId), x: Number(x) || 0, y: Number(y) || 0 });
        toast({ title: 'User Entered Office', description: `User ${userId} joined the room` });
        break;
      }

      case 'movement': {
        const p = message.payload;
        const store = useOfficeStore.getState();
        if (store.currentUser && String(p.userId) === String(store.currentUser.userId)) {
          updateCurrentUserPos(Number(p.x) ?? store.currentUser.x, Number(p.y) ?? store.currentUser.y);
        } else if (p?.userId) {
          updateUserPos(String(p.userId), Number(p.x) ?? 0, Number(p.y) ?? 0);
        }
        break;
      }

      case 'movement-rejected': {
        const store = useOfficeStore.getState();
        updateCurrentUserPos(
          Number(message.payload.x) ?? store.currentUser?.x ?? 0,
          Number(message.payload.y) ?? store.currentUser?.y ?? 0
        );
        break;
      }

      case 'groupChat': {
        const msgUserId = message.payload.userId || 'unknown';
        const msgText = message.payload.message;
        addMessage({
          userId: msgUserId,
          message: msgText,
          timestamp: message.payload.timestamp || Date.now(),
        });

        const cu = useOfficeStore.getState().currentUser;
        if (cu && String(msgUserId) !== String(cu.userId)) {
          toast({
            title: `💬 User ${msgUserId.substring(0, 8)}`,
            description: msgText,
          });
        }
        break;
      }

      case 'user-left':
        removeUser(String(message.payload.userId));
        toast({ title: 'User Left', description: `User ${message.payload.userId} left the office` });
        break;

      case 'incomming:call': {
        const { from, offer } = message.payload;
        const accept = window.confirm(`Incoming call from ${from}. Accept?`);
        if (!accept) return;
        (async () => {
          try {
            PeerService.reset();
            const stream = await acquireLocalMedia();
            PeerService.addLocalStream(stream);
            PeerService.onIce((candidate: any) =>
              wsRef.current?.send(JSON.stringify({ type: 'ice:candidate', payload: { to: from, candidate } }))
            );
            PeerService.onTrack((s: MediaStream) => setRemoteStream(s));
            const ans = await PeerService.getAnswer(offer);
            wsRef.current?.send(JSON.stringify({ type: 'call:accepted', payload: { to: from, ans } }));
            setInCallWith(from);
          } catch (err) {
            console.error('error accepting call', err);
          }
        })();
        break;
      }

      case 'call:accepted': {
        const { from, ans } = message.payload;
        (async () => {
          try {
            await PeerService.setRemoteAnswer(ans);
            setInCallWith(from);
          } catch (err) {
            console.error('error setting remote desc', err);
          }
        })();
        break;
      }

      case 'ice:candidate':
        (async () => {
          if (message.payload.candidate) {
            try {
              await PeerService.addIceCandidate(message.payload.candidate);
            } catch (err) {
              console.warn('addIceCandidate failed', err);
            }
          }
        })();
        break;

      case 'peer:nego:needed': {
        const { from, offer } = message.payload;
        (async () => {
          try {
            const ans = await PeerService.getAnswer(offer);
            wsRef.current?.send(JSON.stringify({ type: 'peer:nego:done', payload: { to: from, ans } }));
          } catch (err) {
            console.error('nego handling failed', err);
          }
        })();
        break;
      }

      case 'peer:nego:final':
        (async () => {
          try {
            await PeerService.setRemoteAnswer(message.payload.ans);
          } catch (err) {
            console.error('peer nego final failed', err);
          }
        })();
        break;

      default:
        break;
    }
  };

  // ── Media / call helpers ──────────────────────────────────────────
  const acquireLocalMedia = async (): Promise<MediaStream> => {
    const current = useOfficeStore.getState().localStream;
    if (current) return current;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setLocalStream(s);
      try {
        PeerService.addLocalStream(s);
      } catch (e) {
        console.warn('PeerService.addLocalStream failed', e);
      }
      return s;
    } catch (e) {
      toast({ title: 'Media error', description: 'Camera/Mic permission required.' });
      throw e;
    }
  };

  const startCall = async (otherId: string) => {
    try {
      PeerService.reset();
      const stream = await acquireLocalMedia();
      PeerService.addLocalStream(stream);
      PeerService.onIce((candidate: any) =>
        wsRef.current?.send(JSON.stringify({ type: 'ice:candidate', payload: { to: otherId, candidate } }))
      );
      PeerService.onTrack((s: MediaStream) => setRemoteStream(s));
      const offer = await PeerService.getOffer();
      wsRef.current?.send(JSON.stringify({ type: 'user:call', payload: { to: otherId, offer } }));
    } catch (e) {
      console.error('startCall failed', e);
    }
  };

  const endCall = () => {
    PeerService.reset();
    const current = useOfficeStore.getState().localStream;
    if (current) {
      current.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setInCallWith(null);
    try {
      wsRef.current?.send(JSON.stringify({ type: 'call:ended', payload: {} }));
    } catch (_e) {
      /* ignore */
    }
  };

  const handleSendMessage = (text: string) => {
    const cu = useOfficeStore.getState().currentUser;
    if (!cu || !spaceId || !text.trim()) return;
    const ts = Date.now();
    addMessage({ userId: cu.userId || '', message: text, timestamp: ts });
    wsRef.current?.send(
      JSON.stringify({
        type: 'groupChat',
        payload: { userId: cu.userId, message: text, groupId: spaceId, timestamp: ts },
      })
    );
  };

  const handleMove = (newX: number, newY: number) => {
    const cu = useOfficeStore.getState().currentUser;
    if (!cu || !wsRef.current) return;
    const targetX = Math.max(0, Math.min(newX, arenaWidth - 1));
    const targetY = Math.max(0, Math.min(newY, arenaHeight - 1));

    // Optimistically update local player position so avatar moves immediately on keypress
    updateCurrentUserPos(targetX, targetY);
    if (spaceId) {
      localStorage.setItem(`office_pos_${spaceId}`, JSON.stringify({ x: targetX, y: targetY }));
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'move',
        payload: {
          x: targetX,
          y: targetY,
          userId: cu.userId,
        },
      })
    );
  };

  // ── Smooth Canvas Render Loop (Grid-Relative Furniture Layout) ─────
  useEffect(() => {
    let animId: number;
    const cell = 60; // 60px grid cell size

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const container = canvas.parentElement;
      const viewportWidth = container ? container.clientWidth : 1200;
      const viewportHeight = Math.max(650, window.innerHeight - 160);

      if (canvas.width !== viewportWidth) canvas.width = viewportWidth;
      if (canvas.height !== viewportHeight) canvas.height = viewportHeight;

      const worldWidthPx = arenaWidth * cell;
      const worldHeightPx = arenaHeight * cell;

      // Lerp my position
      myPosRef.current.currentX += (myPosRef.current.targetX - myPosRef.current.currentX) * 0.25;
      myPosRef.current.currentY += (myPosRef.current.targetY - myPosRef.current.currentY) * 0.25;

      // Lerp other users
      posMapRef.current.forEach((val) => {
        val.currentX += (val.targetX - val.currentX) * 0.25;
        val.currentY += (val.targetY - val.currentY) * 0.25;
      });

      // Smooth Camera offset
      const playerPxX = myPosRef.current.currentX * cell + cell / 2;
      const playerPxY = myPosRef.current.currentY * cell + cell / 2;

      let cameraX = playerPxX - viewportWidth / 2;
      let cameraY = playerPxY - viewportHeight / 2;

      if (worldWidthPx > viewportWidth) {
        cameraX = Math.max(0, Math.min(cameraX, worldWidthPx - viewportWidth));
      } else {
        cameraX = (worldWidthPx - viewportWidth) / 2;
      }

      if (worldHeightPx > viewportHeight) {
        cameraY = Math.max(0, Math.min(cameraY, worldHeightPx - viewportHeight));
      } else {
        cameraY = (worldHeightPx - viewportHeight) / 2;
      }

      // Clear dark studio background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#090d16'; // Deep studio void
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(-cameraX, -cameraY);

      // ── Main Floor (Slate studio tiles) ─────────────────────────
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, worldWidthPx, worldHeightPx);

      // Grid tile lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= worldWidthPx; i += cell) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, worldHeightPx);
        ctx.stroke();
      }
      for (let j = 0; j <= worldHeightPx; j += cell) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(worldWidthPx, j);
        ctx.stroke();
      }

      // ── PROCEDURAL GRID FURNITURE LAYOUT ────────────────────────
      // We generate desks, meeting rooms, and lounge pods systematically across grid blocks!

      const gxCenter = Math.floor(arenaWidth / 2);
      const gyCenter = Math.floor(arenaHeight / 2);

      // 1. EXECUTIVE BOARDROOM (Placed at Top-Center of Grid)
      const roomGx = Math.max(0, gxCenter - 4);
      const roomGy = Math.max(0, gyCenter - 8);
      const roomPxX = roomGx * cell;
      const roomPxY = roomGy * cell;
      const roomW = 8 * cell;
      const roomH = 5 * cell;

      // Mahogany Floor
      ctx.fillStyle = '#451a03';
      ctx.fillRect(roomPxX, roomPxY, roomW, roomH);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4;
      ctx.strokeRect(roomPxX, roomPxY, roomW, roomH);

      // Executive Conference Table
      ctx.fillStyle = '#7c2d12';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(roomPxX + cell, roomPxY + cell * 1.5, roomW - cell * 2, roomH - cell * 3, 24);
      ctx.fill();
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Executive Leather Chairs
      ctx.fillStyle = '#0f172a';
      for (let xC = roomPxX + cell * 1.5; xC <= roomPxX + roomW - cell * 1.5; xC += cell * 1.2) {
        ctx.beginPath(); ctx.arc(xC, roomPxY + cell * 1.1, 12, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(xC, roomPxY + roomH - cell * 1.1, 12, 0, Math.PI * 2); ctx.fill();
      }

      // Presentation TV Screen
      ctx.fillStyle = '#0284c7';
      ctx.shadowColor = 'rgba(2, 132, 199, 0.7)';
      ctx.shadowBlur = 14;
      ctx.fillRect(roomPxX + roomW / 2 - 80, roomPxY + 6, 160, 10);
      ctx.shadowBlur = 0;

      // Boardroom Label Tag
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(roomPxX + 10, roomPxY + 10, 170, 26);
      ctx.fillStyle = '#fcd34d';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('🏢 EXECUTIVE BOARDROOM', roomPxX + 18, roomPxY + 27);

      // 2. REPEATING ENGINEERING WORKSTATION DESKS (Across Grid Blocks)
      for (let gy = 1; gy < arenaHeight; gy += 6) {
        for (let gx = 1; gx < arenaWidth; gx += 6) {
          // Skip if inside boardroom or coffee lounge grid box
          if (gx >= roomGx - 1 && gx <= roomGx + 8 && gy >= roomGy - 1 && gy <= roomGy + 5) continue;
          if (gx >= gxCenter - 4 && gx <= gxCenter + 4 && gy >= gyCenter + 4 && gy <= gyCenter + 9) continue;

          const deskPxX = gx * cell;
          const deskPxY = gy * cell;

          // Wood Desk Top (2x1 cells)
          ctx.fillStyle = '#334155';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 8;
          ctx.fillRect(deskPxX + 10, deskPxY + 10, cell * 2 - 20, cell - 20);
          ctx.shadowBlur = 0;

          // Glowing Dual Monitors
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(deskPxX + 20, deskPxY + 14, 30, 4);
          ctx.fillRect(deskPxX + 60, deskPxY + 14, 30, 4);

          // Keyboards & Mugs
          ctx.fillStyle = '#64748b';
          ctx.fillRect(deskPxX + 40, deskPxY + 24, 35, 8);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath(); ctx.arc(deskPxX + 85, deskYPx(deskPxY), 4, 0, Math.PI * 2); ctx.fill();

          // Office Chair
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(deskPxX + cell, deskPxY + cell + 10, 14, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      function deskYPx(dY: number) {
        return dY + 28;
      }

      // 3. BREAKROOM & COFFEE LOUNGE (Bottom-Center of Grid)
      const lGx = Math.max(0, gxCenter - 4);
      const lGy = Math.min(arenaHeight - 5, gyCenter + 4);
      const lPxX = lGx * cell;
      const lPxY = lGy * cell;
      const lW = 8 * cell;
      const lH = 5 * cell;

      // Parquet Wood Floor
      ctx.fillStyle = '#78350f';
      ctx.fillRect(lPxX, lPxY, lW, lH);
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 3;
      ctx.strokeRect(lPxX, lPxY, lW, lH);

      // Espresso Bar Counter
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(lPxX + cell, lPxY + cell, lW - cell * 2, cell);
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('☕ ESPRESSO BAR & LOUNGE', lPxX + lW / 2, lPxY + cell * 1.6);

      // Cozy Sofas
      ctx.fillStyle = '#065f46';
      ctx.beginPath();
      ctx.roundRect(lPxX + cell * 1.5, lPxY + cell * 3, lW - cell * 3, cell * 1.2, 16);
      ctx.fill();

      // Potted Monstera Plants
      ctx.fillStyle = '#15803d';
      ctx.beginPath(); ctx.arc(lPxX + cell * 0.6, lPxY + cell * 0.6, 20, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(lPxX + lW - cell * 0.6, lPxY + cell * 0.6, 20, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(lPxX + lW - cell * 0.6, lPxY + lH - cell * 0.6, 20, 0, Math.PI * 2); ctx.fill();

      // ── Outer Boundary Wall ────────────────────────────────────
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 6;
      ctx.strokeRect(0, 0, worldWidthPx, worldHeightPx);

      // ── OTHER USERS AVATARS ────────────────────────────────────
      users.forEach((u, uId) => {
        const animPos = posMapRef.current.get(uId);
        if (!animPos) return;

        const uPxX = animPos.currentX * cell + cell / 2;
        const uPxY = animPos.currentY * cell + cell / 2;
        const style = getUserStyle(uId);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(uPxX, uPxY + 16, 18, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing Ring
        ctx.beginPath();
        ctx.fillStyle = style.glow;
        ctx.arc(uPxX, uPxY, 26, 0, Math.PI * 2);
        ctx.fill();

        // Avatar Circle
        ctx.beginPath();
        ctx.fillStyle = style.bg;
        ctx.arc(uPxX, uPxY, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = style.border;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Initial
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(uId.charAt(0).toUpperCase(), uPxX, uPxY + 5);

        // Name Tag Badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(uPxX - 45, uPxY + 28, 90, 22, 6);
        ctx.fill();
        ctx.strokeStyle = style.border;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(`User ${uId.substring(0, 6)}`, uPxX, uPxY + 43);
      });

      // ── CURRENT USER ("YOU") ──────────────────────────────────
      if (currentUser && typeof currentUser.x === 'number') {
        const myPxX = myPosRef.current.currentX * cell + cell / 2;
        const myPxY = myPosRef.current.currentY * cell + cell / 2;

        // Soft Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(myPxX, myPxY + 18, 22, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glowing Red Halo
        ctx.beginPath();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.arc(myPxX, myPxY, 32, 0, Math.PI * 2);
        ctx.fill();

        // Avatar Circle (Ruby Red)
        ctx.beginPath();
        ctx.fillStyle = '#ef4444';
        ctx.arc(myPxX, myPxY, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 3;
        ctx.stroke();

        // "YOU" Icon text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('YOU', myPxX, myPxY + 5);

        // Floating "YOU" Badge
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(myPxX - 30, myPxY + 32, 60, 22, 6);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText('YOU', myPxX, myPxY + 47);
      }

      ctx.restore();

      // ── MINI-MAP RADAR DRAWING ──────────────────────────────────
      const miniCanvas = miniMapRef.current;
      if (miniCanvas) {
        const mCtx = miniCanvas.getContext('2d');
        if (mCtx) {
          const mW = 160;
          const mH = 120;
          if (miniCanvas.width !== mW) miniCanvas.width = mW;
          if (miniCanvas.height !== mH) miniCanvas.height = mH;

          mCtx.clearRect(0, 0, mW, mH);
          mCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          mCtx.fillRect(0, 0, mW, mH);

          const scaleX = mW / arenaWidth;
          const scaleY = mH / arenaHeight;

          // Boardroom Mini Highlight
          mCtx.fillStyle = 'rgba(245, 158, 11, 0.4)';
          mCtx.fillRect(roomGx * scaleX, roomGy * scaleY, 8 * scaleX, 5 * scaleY);

          // Lounge Mini Highlight
          mCtx.fillStyle = 'rgba(52, 211, 153, 0.4)';
          mCtx.fillRect(lGx * scaleX, lGy * scaleY, 8 * scaleX, 5 * scaleY);

          // Other users mini dots
          users.forEach((u) => {
            if (typeof u.x !== 'number') return;
            mCtx.fillStyle = '#14b8a6';
            mCtx.beginPath();
            mCtx.arc(u.x * scaleX, u.y * scaleY, 3, 0, Math.PI * 2);
            mCtx.fill();
          });

          // Current User mini dot (Red)
          if (currentUser && typeof currentUser.x === 'number') {
            mCtx.fillStyle = '#ef4444';
            mCtx.beginPath();
            mCtx.arc(myPosRef.current.currentX * scaleX, myPosRef.current.currentY * scaleY, 4, 0, Math.PI * 2);
            mCtx.fill();
          }

          mCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          mCtx.strokeRect(0, 0, mW, mH);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [currentUser, users, arenaWidth, arenaHeight]);

  // ── Keyboard Controls (Arrow + WASD) ─────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space'].includes(e.code)) {
      e.preventDefault(); // Prevent browser scrolling
    }
    const cu = useOfficeStore.getState().currentUser;
    if (!cu) return;
    const { x, y } = cu;

    if (e.key === 'ArrowUp' || e.code === 'KeyW') handleMove(x, y - 1);
    else if (e.key === 'ArrowDown' || e.code === 'KeyS') handleMove(x, y + 1);
    else if (e.key === 'ArrowLeft' || e.code === 'KeyA') handleMove(x - 1, y);
    else if (e.key === 'ArrowRight' || e.code === 'KeyD') handleMove(x + 1, y);
  };

  // ── Guard fallback if missing spaceId ──────────────────────────────
  if (!spaceId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-900 border-slate-800 text-white">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Space Not Found</h2>
            <p className="text-slate-400 mb-6">Invalid workspace route provided.</p>
            <Button onClick={() => navigate('/dashboard')} className="bg-blue-600 hover:bg-blue-500 text-white">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeCount = users.size + (currentUser ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans outline-none" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* ── Sleek Modern Navbar ──────────────────────────────────────── */}
      <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-none text-white">Metaverse Office</h1>
              <span className="text-xs text-slate-400 font-mono">ID: {spaceId.substring(0, 12)}...</span>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-slate-800 mx-1" />

          {/* Connection Status Pill */}
          <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${wsConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
            <Wifi className="w-3.5 h-3.5" />
            <span>{wsConnected ? 'Live Connection' : 'Connecting...'}</span>
          </div>
        </div>

        {/* Action Controls & Active Users Stack */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold">{activeCount} Online</span>
          </div>

          <Button
            onClick={() => setChatOpen(!chatOpen)}
            variant="outline"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 flex items-center gap-2 text-xs"
          >
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span>Chat ({messages.length})</span>
          </Button>

          <Button
            onClick={() => {
              if (inCallWith) endCall();
              else {
                const first = Array.from(users.keys())[0];
                if (first) startCall(first);
                else toast({ title: 'No Users Nearby', description: 'Nobody in proximity to call.' });
              }
            }}
            className={inCallWith ? 'bg-red-600 hover:bg-red-500 text-white text-xs gap-1.5' : 'bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5'}
          >
            {inCallWith ? <PhoneOff className="w-4 h-4" /> : <PhoneCall className="w-4 h-4" />}
            <span>{inCallWith ? 'End Call' : 'Call Nearby'}</span>
          </Button>

          <Button
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit</span>
          </Button>
        </div>
      </header>

      {/* ── Main Office Viewport Area ────────────────────────────────── */}
      <main className="flex-1 relative overflow-hidden bg-slate-950 flex flex-col justify-center items-center p-2">
        <div className="w-full h-full border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative bg-slate-900">
          <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" />

          {/* Floating Controls Hint */}
          <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-3 text-xs text-slate-400 shadow-xl z-30">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Use <b>Arrow Keys</b> or <b>WASD</b> to move avatar smooth</span>
          </div>

          {/* Mini-Map Radar HUD Overlay (Bottom-Right) */}
          <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-800 shadow-2xl z-30 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <MapPin className="w-3 h-3 text-blue-400" />
              <span>Office Radar</span>
            </div>
            <canvas ref={miniMapRef} className="rounded border border-slate-700/60 block" />
          </div>

          {/* Video Streams Container */}
          {(localStream || remoteStream) && (
            <div className="absolute top-4 right-4 flex gap-3 z-30">
              {localStream && (
                <div className="relative rounded-xl overflow-hidden border-2 border-blue-500 shadow-xl bg-slate-900 w-44 h-32">
                  <video
                    autoPlay
                    muted
                    playsInline
                    ref={(v) => {
                      if (v && localStream) v.srcObject = localStream;
                    }}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-2 text-[10px] font-bold bg-slate-950/80 px-1.5 py-0.5 rounded text-slate-300">You (Mic)</span>
                </div>
              )}
              {remoteStream && (
                <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 shadow-xl bg-slate-900 w-44 h-32">
                  <video
                    autoPlay
                    playsInline
                    ref={(v) => {
                      if (v && remoteStream) v.srcObject = remoteStream;
                    }}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-2 text-[10px] font-bold bg-slate-950/80 px-1.5 py-0.5 rounded text-emerald-400">Connected</span>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Floating Group Chat Drawer ───────────────────────────────── */}
      {chatOpen && (
        <div className="fixed bottom-6 right-6 w-88 bg-slate-900/95 backdrop-blur-xl shadow-2xl rounded-2xl flex flex-col border border-slate-800 z-50 overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b border-slate-800 bg-slate-850">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <h2 className="font-bold text-sm text-slate-200">Office Group Chat</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white h-7 w-7 p-0"
              onClick={() => setChatOpen(false)}
            >
              <X size={16} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-72 text-xs">
            {messages.length === 0 && (
              <p className="text-center text-slate-500 py-6">No messages in office yet. Say hello!</p>
            )}
            {messages.map((msg, idx) => {
              const cu = useOfficeStore.getState().currentUser;
              const isMe = cu && msg.userId === cu.userId;
              return (
                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl shadow-sm ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-xs'
                    }`}
                  >
                    <p className="text-[10px] font-bold opacity-75 mb-0.5">
                      {isMe ? 'You' : `User ${msg.userId?.substring(0, 8)}`}
                    </p>
                    <p className="text-xs leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center p-3 border-t border-slate-800 bg-slate-900 gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type office message..."
              className="flex-1 bg-slate-950 border-slate-800 text-xs text-slate-200 focus-visible:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage(chatInput);
                  setChatInput('');
                }
              }}
            />
            <Button
              onClick={() => {
                handleSendMessage(chatInput);
                setChatInput('');
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4"
            >
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Office;