/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { spaceAPI } from '@/lib/api';
import { Input } from '@/components/ui/input';
import PeerService from './service/peer';
import { useOfficeStore } from '@/store/officeStore';
import { useState } from 'react';

const Office = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');

  // ── Zustand office store ──────────────────────────────────────────
  const {
    arenaWidth, arenaHeight, setArenaDimensions,
    currentUser, setCurrentUser, updateCurrentUserPos,
    users, upsertUser, removeUser, updateUserPos,
    messages, addMessage,
    inCallWith, setInCallWith,
    localStream, setLocalStream,
    remoteStream, setRemoteStream,
    setWsConnected,
    resetOffice,
  } = useOfficeStore();
  // ─────────────────────────────────────────────────────────────────

  const token = localStorage.getItem('token') || '';
  const webSocketUrl = import.meta.env.VITE_WS_URL;

  const proximityThreshold = 3;

  function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  // ── WebSocket + space dims init ───────────────────────────────────
  useEffect(() => {
    if (!webSocketUrl || !spaceId) return;

    // fetch space dimensions
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
      ws.send(JSON.stringify({ type: 'join', payload: { spaceId, token } }));
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
          const spawnX = Number(message.payload?.spawn?.x ?? Math.floor(Math.random() * arenaWidth));
          const spawnY = Number(message.payload?.spawn?.y ?? Math.floor(Math.random() * arenaHeight));
          const userId = message.payload?.userId;
          setCurrentUser({ x: spawnX, y: spawnY, userId });
          toast({ title: 'Joined space', description: `You joined space ${spaceId}` });

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
        toast({ title: 'User joined', description: `User ${userId} joined` });
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
          Number(message.payload.y) ?? store.currentUser?.y ?? 0,
        );
        toast({ title: 'Movement rejected', description: `Cannot move to (${message.payload.x}, ${message.payload.y})` });
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

        // Show floating toast notification for incoming chat messages
        const cu = useOfficeStore.getState().currentUser;
        if (cu && String(msgUserId) !== String(cu.userId)) {
          toast({
            title: `💬 Chat from User ${msgUserId}`,
            description: msgText,
          });
        }
        break;
      }

      case 'user-left':
        removeUser(String(message.payload.userId));
        toast({ title: 'User left', description: `User ${message.payload.userId} left` });
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
          } catch (err) { console.error('error accepting call', err); }
        })();
        break;
      }

      case 'call:accepted': {
        const { from, ans } = message.payload;
        (async () => {
          try {
            await PeerService.setRemoteAnswer(ans);
            setInCallWith(from);
          } catch (err) { console.error('error setting remote desc', err); }
        })();
        break;
      }

      case 'ice:candidate':
        (async () => {
          if (message.payload.candidate) {
            try { await PeerService.addIceCandidate(message.payload.candidate); }
            catch (err) { console.warn('addIceCandidate failed', err); }
          }
        })();
        break;

      case 'peer:nego:needed': {
        const { from, offer } = message.payload;
        (async () => {
          try {
            const ans = await PeerService.getAnswer(offer);
            wsRef.current?.send(JSON.stringify({ type: 'peer:nego:done', payload: { to: from, ans } }));
          } catch (err) { console.error('nego handling failed', err); }
        })();
        break;
      }

      case 'peer:nego:final':
        (async () => {
          try { await PeerService.setRemoteAnswer(message.payload.ans); }
          catch (err) { console.error('peer nego final failed', err); }
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
      try { PeerService.addLocalStream(s); } catch (e) { console.warn('PeerService.addLocalStream failed', e); }
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
    } catch (e) { console.error('startCall failed', e); }
  };

  const endCall = () => {
    PeerService.reset();
    const current = useOfficeStore.getState().localStream;
    if (current) { current.getTracks().forEach((t) => t.stop()); setLocalStream(null); }
    setRemoteStream(null);
    setInCallWith(null);
    try { wsRef.current?.send(JSON.stringify({ type: 'call:ended', payload: {} })); } catch (_e) { /* ignore */ }
  };

  const handleSendMessage = (text: string) => {
    const cu = useOfficeStore.getState().currentUser;
    if (!cu || !spaceId || !text.trim()) return;
    const ts = Date.now();
    addMessage({ userId: cu.userId || '', message: text, timestamp: ts });
    wsRef.current?.send(JSON.stringify({
      type: 'groupChat',
      payload: { userId: cu.userId, message: text, groupId: spaceId, timestamp: ts },
    }));
  };

  const handleMove = (newX: number, newY: number) => {
    const cu = useOfficeStore.getState().currentUser;
    if (!cu || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({
      type: 'move',
      payload: {
        x: Math.max(0, Math.min(newX, arenaWidth - 1)),
        y: Math.max(0, Math.min(newY, arenaHeight - 1)),
        userId: cu.userId,
      },
    }));
  };

  // ── Canvas drawing (Player Camera Viewport) ────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cell = 50;
    const worldWidthPx = arenaWidth * cell;
    const worldHeightPx = arenaHeight * cell;

    // Fixed responsive viewport dimensions (1000px x 600px or parent container size)
    const container = canvas.parentElement;
    const viewportWidth = container ? Math.min(container.clientWidth, 1200) : 1000;
    const viewportHeight = 650;

    if (canvas.width !== viewportWidth) canvas.width = viewportWidth;
    if (canvas.height !== viewportHeight) canvas.height = viewportHeight;

    // Calculate Camera offsets centered on the Current User ("You")
    let cameraX = 0;
    let cameraY = 0;
    if (currentUser && typeof currentUser.x === 'number') {
      const playerPxX = currentUser.x * cell + cell / 2;
      const playerPxY = currentUser.y * cell + cell / 2;
      cameraX = playerPxX - viewportWidth / 2;
      cameraY = playerPxY - viewportHeight / 2;
    }

    // Clamp camera within world boundaries if arena is larger than viewport
    if (worldWidthPx > viewportWidth) {
      cameraX = Math.max(0, Math.min(cameraX, worldWidthPx - viewportWidth));
    } else {
      cameraX = (worldWidthPx - viewportWidth) / 2; // center small map
    }

    if (worldHeightPx > viewportHeight) {
      cameraY = Math.max(0, Math.min(cameraY, worldHeightPx - viewportHeight));
    } else {
      cameraY = (worldHeightPx - viewportHeight) / 2; // center small map
    }

    // Clear viewport
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a'; // Slate dark background outside the map
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Shift context by negative camera coordinates
    ctx.translate(-cameraX, -cameraY);

    // Map background (Arena boundary)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, worldWidthPx, worldHeightPx);

    // Grid lines within world boundary
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= worldWidthPx; i += cell) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, worldHeightPx); ctx.stroke();
    }
    for (let j = 0; j <= worldHeightPx; j += cell) {
      ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(worldWidthPx, j); ctx.stroke();
    }

    // Border around arena
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, worldWidthPx, worldHeightPx);

    // Other users
    users.forEach((user) => {
      if (typeof user.x !== 'number') return;
      const userPxX = user.x * cell + cell / 2;
      const userPxY = user.y * cell + cell / 2;

      ctx.beginPath();
      ctx.fillStyle = '#14b8a6'; // Teal accent
      ctx.arc(userPxX, userPxY, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f766e';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`User ${user.userId}`, userPxX, userPxY + 34);
    });

    // Current user ("You")
    if (currentUser && typeof currentUser.x === 'number') {
      const myPxX = currentUser.x * cell + cell / 2;
      const myPxY = currentUser.y * cell + cell / 2;

      // Glow halo around current player
      ctx.beginPath();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.arc(myPxX, myPxY, 26, 0, Math.PI * 2);
      ctx.fill();

      // Main dot
      ctx.beginPath();
      ctx.fillStyle = '#ef4444'; // Bright Red
      ctx.arc(myPxX, myPxY, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 2;
      ctx.stroke();

      // "You" Badge
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('You', myPxX, myPxY + 36);
    }

    ctx.restore();
  }, [currentUser, users, arenaWidth, arenaHeight]);

  // ── Keyboard movement & Focus ─────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault(); // Prevent page scrolling
    }
    const cu = useOfficeStore.getState().currentUser;
    if (!cu) return;
    const { x, y } = cu;
    if (e.key === 'ArrowUp') handleMove(x, y - 1);
    else if (e.key === 'ArrowDown') handleMove(x, y + 1);
    else if (e.key === 'ArrowLeft') handleMove(x - 1, y);
    else if (e.key === 'ArrowRight') handleMove(x + 1, y);
  };

  // ── Guards ────────────────────────────────────────────────────────
  if (!spaceId) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Space Not Found</h2>
            <p className="text-muted-foreground mb-6"></p>
            <Button onClick={() => navigate('/dashboard')} variant="hero">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="p-4" onKeyDown={handleKeyDown} tabIndex={0}>
      <h1 className="text-2xl font-bold mb-4">Arena</h1>
      <div className="mb-4">
        <p className="text-sm text-gray-600">Space ID: {spaceId}</p>
        <p className="text-sm text-gray-600">Connected Users: {users.size + (currentUser ? 1 : 0)}</p>
        <div className="flex gap-2">
          <Button onClick={() => setChatOpen(true)}>Open Chat</Button>
          <Button
            onClick={() => {
              if (inCallWith) endCall();
              else {
                const first = Array.from(users.keys())[0];
                if (first) startCall(first);
                else toast({ title: 'No users', description: 'No other users to call.' });
              }
            }}
          >
            {inCallWith ? 'End Call' : 'Call Someone'}
          </Button>
        </div>
        <div className="flex gap-4 mt-4">
          {localStream && (
            <video autoPlay muted playsInline
              ref={(v) => { if (v && localStream) v.srcObject = localStream; }}
              className="w-48 h-36 bg-black rounded"
            />
          )}
          {remoteStream && (
            <video autoPlay playsInline
              ref={(v) => { if (v && remoteStream) v.srcObject = remoteStream; }}
              className="w-48 h-36 bg-black rounded"
            />
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <canvas ref={canvasRef} className="bg-white block" />
      </div>
      <p className="mt-2 text-sm text-gray-500">Use arrow keys to move your avatar</p>

      {/* Floating Chat */}
      {chatOpen && (
        <div className="fixed bottom-4 right-4 w-80 bg-white shadow-xl rounded-xl flex flex-col border border-gray-200 z-50">
          <div className="flex justify-between items-center p-2 border-b bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-t-xl">
            <h2 className="font-semibold">Group Chat</h2>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => setChatOpen(false)}>
              <X size={16} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-64">
            {messages.length === 0 && <p className="text-center text-gray-400 text-sm">No messages yet</p>}
            {messages.map((msg, idx) => {
              const cu = useOfficeStore.getState().currentUser;
              const isMe = cu && msg.userId === cu.userId;
              return (
                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-3 py-2 rounded-lg shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                    <p className="text-xs font-semibold opacity-80 mb-0.5">{isMe ? 'You' : `User ${msg.userId}`}</p>
                    <p className="text-sm leading-snug">{msg.message}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center p-2 border-t bg-gray-50 gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 border-gray-300"
              onKeyDown={(e) => {
                if (e.key === 'Enter') { handleSendMessage(chatInput); setChatInput(''); }
              }}
            />
            <Button onClick={() => { handleSendMessage(chatInput); setChatInput(''); }} className="bg-blue-600 hover:bg-blue-700 text-white">
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Office;