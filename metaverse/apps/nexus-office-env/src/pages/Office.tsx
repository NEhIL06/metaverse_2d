/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { spaceAPI } from '@/lib/api';
import { Input } from '@/components/ui/input';
import PeerService from './service/peer';

type UserMap = Map<string, { x: number; y: number; userId: string }>;

const Office = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [inCallWith, setInCallWith] = useState<string | null>(null); // user id we are in call with
  const pendingCallRef = useRef<{ to?: string; from?: string } | null>(null);

  const proximityThreshold = 3; // distance threshold to trigger call (grid units)

  function distanceBetween(userA: { x: number; y: number }, userB: { x: number; y: number }) {
    const dx = userA.x - userB.x;
    const dy = userA.y - userB.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [currentUser, setCurrentUser] = useState<{ x: number; y: number; userId?: string } | null>(
    null
  );
  const [users, setUsers] = useState<UserMap>(new Map());
  const [messages, setMessages] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [arenaWidth, setArenaWidth] = useState<number>(10); // default grid width (units)
  const [arenaHeight, setArenaHeight] = useState<number>(8); // default grid height (units)
  const navigate = useNavigate();

  const token = localStorage.getItem('token') || '';

  const webSocketUrl = import.meta.env.VITE_WS_URL;

  // initialize websocket + fetch space dims
  useEffect(() => {
    if (!webSocketUrl || !spaceId) {
      console.warn('Missing WS URL or spaceId');
      return;
    }

    // fetch space dimensions first
    spaceAPI
      .getById(spaceId)
      .then((sp: any) => {
        if (sp && sp.dimensions) {
          // expect "W x H" as "100x200"
          const parts = String(sp.dimensions).split('x').map(s => s.trim());
          const w = Number(parts[0]) || arenaWidth;
          const h = Number(parts[1]) || arenaHeight;
          setArenaWidth(w);
          setArenaHeight(h);
          console.log('Space dims', w, h);
        }
      })
      .catch(error => {
        console.error('Error fetching space:', error);
      });

    const ws = new WebSocket(webSocketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'join',
          payload: {
            spaceId,
            token,
          },
        })
      );
    };

    ws.onmessage = (ev: MessageEvent<any>) => {
      try {
        const message = JSON.parse(ev.data);
        handleWebSocketMessage(message);
      } catch (err) {
        console.error('invalid ws message', err);
      }
    };

    ws.onclose = () => {
      console.log('websocket closed');
    };

    ws.onerror = e => {
      console.error('ws error', e);
    };

    return () => {
      try {
        ws.close();
      } catch (e) {
        /* ignore */
      }
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, webSocketUrl]);

  // When users or currentUser changes, check proximity and initiate deterministic calls
  useEffect(() => {
    if (!currentUser || !currentUser.userId) return;
    users.forEach((user, id) => {
      if (inCallWith === id) return;
      // skip self if server included current user in users list
      if (String(id) === String(currentUser.userId)) return;
      const dist = distanceBetween(currentUser as any, user as any);
      if (dist <= proximityThreshold) {
        const myId = String(currentUser.userId);
        const otherId = String(id);
        const initiator = myId < otherId ? myId : otherId;
        if (myId === initiator) {
          startCall(otherId);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, currentUser, inCallWith]);

  const acquireLocalMedia = async () => {
    if (localStream) return localStream;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setLocalStream(s);
      // attach tracks to PeerService so getOffer() will include them to the PeerConnection
      try {
        PeerService.addLocalStream(s);
      } catch (e) {
        // PeerService may expect stream to be added later — ok to ignore failure here
        console.warn('PeerService.addLocalStream failed', e);
      }
      return s;
    } catch (e) {
      toast({ title: 'Media error', description: 'Camera/Mic permission required.' });
      throw e;
    }
  };

  const handleWebSocketMessage = (message: any) => {
    if (!message || !message.type) return;
    switch (message.type) {
      case 'space-joined': {
        // server sends spawn coords and list of users
        try {
          const spawnX = Number(message.payload?.spawn?.x ?? Math.floor(Math.random() * arenaWidth));
          const spawnY = Number(message.payload?.spawn?.y ?? Math.floor(Math.random() * arenaHeight));
          const userId = message.payload?.userId;
          setCurrentUser({
            x: spawnX,
            y: spawnY,
            userId,
          });
          toast({
            title: 'Joined space',
            description: `You have joined space ${message.payload.spaceId}`,
          });

          const userMap: UserMap = new Map();
          (message.payload?.users ?? []).forEach((u: any) => {
            if (!u || !u.userId) return;
            // don't include ourself in the 'other users' list
            if (String(u.userId) === String(userId)) return;
            userMap.set(String(u.userId), {
              x: Number(u.x) || 0,
              y: Number(u.y) || 0,
              userId: String(u.userId),
            });
          });
          setUsers(userMap);
        } catch (e) {
          console.error('space-joined handling error', e);
        }
        break;
      }

      case 'user-joined': {
        const payload = message.payload;
        setUsers(prev => {
          const newUsers = new Map(prev);
          newUsers.set(String(payload.userId), {
            x: Number(payload.x) || 0,
            y: Number(payload.y) || 0,
            userId: String(payload.userId),
          });
          toast({
            title: 'User joined',
            description: `User ${payload.userId} has joined the space`,
          });
          return newUsers;
        });
        break;
      }

      case 'movement': {
        const p = message.payload;
        // if movement belongs to current user, update currentUser coords
        if (currentUser && String(p.userId) === String(currentUser.userId)) {
          setCurrentUser(prev => (prev ? { ...prev, x: Number(p.x) || prev.x, y: Number(p.y) || prev.y } : prev));
        } else {
          setUsers(prev => {
            const newUsers = new Map(prev);
            const u = newUsers.get(String(p.userId));
            if (u) {
              u.x = Number(p.x) || u.x;
              u.y = Number(p.y) || u.y;
              newUsers.set(String(p.userId), u);
            } else {
              newUsers.set(String(p.userId), {
                x: Number(p.x) || 0,
                y: Number(p.y) || 0,
                userId: String(p.userId),
              });
            }
            return newUsers;
          });
        }
        break;
      }

      case 'groupChat': {
        setMessages(prev => [...prev, message.payload]);
        break;
      }

      case 'incomming:call': {
        // server forwards the offer to callee
        const { from, offer } = message.payload;
        const accept = window.confirm(`Incoming call from ${from}. Accept?`);
        if (!accept) {
          // could send a rejection message to server here if implemented
          return;
        }

        (async () => {
          try {
            await acquireLocalMedia();
            PeerService.reset();
            // ensure PeerService has the stream
            if (localStream) {
              PeerService.addLocalStream(localStream);
            }
            PeerService.onIce((candidate: any) => {
              wsRef.current?.send(
                JSON.stringify({
                  type: 'ice:candidate',
                  payload: { to: from, candidate },
                })
              );
            });
            PeerService.onTrack((stream: MediaStream) => setRemoteStream(stream));

            // getAnswer will set remote description, create answer and set local desc
            const ans = await PeerService.getAnswer(offer);
            wsRef.current?.send(
              JSON.stringify({
                type: 'call:accepted',
                payload: { to: from, ans },
              })
            );
            setInCallWith(from);
          } catch (err) {
            console.error('error accepting call', err);
          }
        })();
        break;
      }

      case 'call:accepted': {
        // initiator receives answer
        const { from, ans } = message.payload;
        (async () => {
          try {
            // assume this sets remote description for the initiator
            await PeerService.setLocalDescription(ans);
            setInCallWith(from);
          } catch (err) {
            console.error('error setting remote desc', err);
          }
        })();
        break;
      }

      case 'ice:candidate': {
        const { candidate } = message.payload;
        (async () => {
          if (candidate) {
            try {
              await PeerService.addIceCandidate(candidate);
            } catch (err) {
              console.warn('addIceCandidate failed', err);
            }
          }
        })();
        break;
      }

      case 'peer:nego:needed': {
        const { from, offer } = message.payload;
        (async () => {
          try {
            const ans = await PeerService.getAnswer(offer);
            wsRef.current?.send(
              JSON.stringify({
                type: 'peer:nego:done',
                payload: { to: from, ans },
              })
            );
          } catch (err) {
            console.error('nego handling failed', err);
          }
        })();
        break;
      }

      case 'peer:nego:final': {
        const { ans } = message.payload;
        (async () => {
          try {
            await PeerService.setLocalDescription(ans);
          } catch (err) {
            console.error('peer nego final failed', err);
          }
        })();
        break;
      }

      case 'movement-rejected': {
        setCurrentUser(prev =>
          prev
            ? {
                ...prev,
                x: Number(message.payload.x) || prev.x,
                y: Number(message.payload.y) || prev.y,
              }
            : prev
        );
        toast({
          title: 'Movement rejected',
          description: `You cannot move to (${message.payload.x}, ${message.payload.y})`,
        });
        break;
      }

      case 'user-left': {
        setUsers(prev => {
          const newUsers = new Map(prev);
          newUsers.delete(String(message.payload.userId));
          return newUsers;
        });
        toast({
          title: 'User left',
          description: `User ${message.payload.userId} has left the space`,
        });
        break;
      }

      default:
        // ignore unknown events
        break;
    }
  };

  const startCall = async (otherId: string) => {
    try {
      await acquireLocalMedia();
      PeerService.reset();

      PeerService.onIce((candidate: any) => {
        wsRef.current?.send(
          JSON.stringify({
            type: 'ice:candidate',
            payload: { to: otherId, candidate },
          })
        );
      });

      PeerService.onTrack((stream: MediaStream) => {
        setRemoteStream(stream);
      });

      const offer = await PeerService.getOffer();
      wsRef.current?.send(
        JSON.stringify({
          type: 'user:call',
          payload: { to: otherId, offer },
        })
      );

      pendingCallRef.current = { to: otherId };
    } catch (e) {
      console.error('startCall failed', e);
    }
  };

  const endCall = () => {
    PeerService.reset();
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setInCallWith(null);
    pendingCallRef.current = null;
    // optionally inform server
    try {
      wsRef.current?.send(JSON.stringify({ type: 'call:ended', payload: {} }));
    } catch (e) {
      /* ignore */
    }
  };

  const handleSendMessage = (text: string) => {
    if (!currentUser || !spaceId || !text.trim()) return;

    const newMsg = { userId: currentUser.userId, message: text, timestamp: Date.now() };
    setMessages(prev => [...prev, newMsg]);

    wsRef.current?.send(
      JSON.stringify({
        type: 'groupChat',
        payload: {
          userId: currentUser.userId,
          message: text,
          groupId: spaceId,
          timestamp: newMsg.timestamp,
        },
      })
    );
  };

  // Send movement request
  const handleMove = (newX: number, newY: number) => {
    if (!currentUser || !wsRef.current) return;
    // clamp to arena bounds
    const xClamped = Math.max(0, Math.min(newX, arenaWidth - 1));
    const yClamped = Math.max(0, Math.min(newY, arenaHeight - 1));

    wsRef.current.send(
      JSON.stringify({
        type: 'move',
        payload: {
          x: xClamped,
          y: yClamped,
          userId: currentUser.userId,
        },
      })
    );
  };

  // Draw the arena + avatars
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // set canvas pixel size to match grid dimensions (each grid cell = 50px)
    const cell = 50;
    const widthPx = arenaWidth * cell;
    const heightPx = arenaHeight * cell;
    // keep canvas size updated explicitly
    if (canvas.width !== widthPx) canvas.width = widthPx;
    if (canvas.height !== heightPx) canvas.height = heightPx;

    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#eee';
    for (let i = 0; i <= canvas.width; i += cell) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j <= canvas.height; j += cell) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // Draw current user (if present)
    if (currentUser && typeof currentUser.x === 'number') {
      ctx.beginPath();
      ctx.fillStyle = '#FF6B6B';
      ctx.arc(currentUser.x * cell + cell / 2, currentUser.y * cell + cell / 2, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('You', currentUser.x * cell + cell / 2, currentUser.y * cell + cell / 2 + 40);
    }

    // Draw other users
    users.forEach(user => {
      if (typeof user.x !== 'number') return;
      ctx.beginPath();
      ctx.fillStyle = '#4ECDC4';
      ctx.arc(user.x * cell + cell / 2, user.y * cell + cell / 2, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`User ${user.userId}`, user.x * cell + cell / 2, user.y * cell + cell / 2 + 40);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, users, arenaWidth, arenaHeight]);

  const handleKeyDown = (e: any) => {
    if (!currentUser) return;
    const { x, y } = currentUser;
    switch (e.key) {
      case 'ArrowUp':
        handleMove(x, y - 1);
        break;
      case 'ArrowDown':
        handleMove(x, y + 1);
        break;
      case 'ArrowLeft':
        handleMove(x - 1, y);
        break;
      case 'ArrowRight':
        handleMove(x + 1, y);
        break;
      default:
        break;
    }
  };

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

  return (
    <div className="p-4" onKeyDown={handleKeyDown} tabIndex={0}>
      <h1 className="text-2xl font-bold mb-4">Arena</h1>
      <div className="mb-4">
        <p className="text-sm text-gray-600">Token: {token ? token.substring(0, 12) + '...' : 'none'}</p>
        <p className="text-sm text-gray-600">Space ID: {spaceId}</p>
        <p className="text-sm text-gray-600">
          Connected Users: {users.size + (currentUser ? 1 : 0)}
        </p>
        <div className="flex gap-2">
          <Button onClick={() => setChatOpen(true)}>Open Chat</Button>
          <Button
            onClick={() => {
              if (inCallWith) endCall();
              else if (currentUser) {
                // try to call first nearby user (simple fallback)
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
    <video
      autoPlay
      muted
      playsInline
      ref={video => {
        if (video && localStream) video.srcObject = localStream;
      }}
      className="w-48 h-36 bg-black rounded"
    />
  )}
  {remoteStream && (
    <video
      autoPlay
      playsInline
      ref={video => {
        if (video && remoteStream) video.srcObject = remoteStream;
      }}
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
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => setChatOpen(false)}
            >
              <X size={16} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-64 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {messages.length === 0 && <p className="text-center text-gray-400 text-sm">No messages yet</p>}
            {messages.map((msg, idx) => {
              const isMe = currentUser && msg.userId === currentUser.userId;
              return (
                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] px-3 py-2 rounded-lg shadow-sm ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p className="text-xs font-semibold opacity-80 mb-0.5">
                      {isMe ? 'You' : `User ${msg.userId}`}
                    </p>
                    <p className="text-sm leading-snug">{msg.message}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center p-2 border-t bg-gray-50 gap-2">
            <Input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 border-gray-300"
              onKeyDown={e => {
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
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