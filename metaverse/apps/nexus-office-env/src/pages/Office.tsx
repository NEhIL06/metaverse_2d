/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { spaceAPI } from '@/lib/api';
import Dashboard from './Dashboard';
import { GroupChat } from '@/components/chat/GroupChat';
import { set } from 'date-fns';
import { Input } from '@/components/ui/input';
import { PeerService } from './service/peer';

const Office = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
const [localStream, setLocalStream] = useState<MediaStream | null>(null);
const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
const [inCallWith, setInCallWith] = useState<string | null>(null); // user id we are in call with
const pendingCallRef = useRef<{ to?: string, from?: string } | null>(null);

  const proximityThreshold = 3; // distance threshold to trigger call

  function distanceBetween(userA: any, userB: any) {
    const dx = userA.x - userB.x;
    const dy = userA.y - userB.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  const { toast } = useToast();
  const canvasRef = useRef<any>(null);
  const wsRef = useRef<any>(null);
  const [currentUser, setCurrentUser] = useState<any>({});
  const [users, setUsers] = useState(new Map());
  const [length, setLength] = useState<any>('');
  const [breadth, setBreadth] = useState<any>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [x, setx] = useState(0);
  const [y, sety] = useState(0);
  const navigate = useNavigate();

  const token = localStorage.getItem('token') || '';

  const webSocketUrl = import.meta.env.VITE_WS_URL;
  // Initialize WebSocket connection and handle URL params
  useEffect(() => {
    //const urlParams = new URLSearchParams(window.location.search);
    //const token = urlParams.get('token') || '';
    //const spaceId = urlParams.get('spaceId') || '';
    //setParams({ token, spaceId });

    // Initialize WebSocket
    if(!webSocketUrl) {
      console.log("No webSocketUrl")
      return
    }
    wsRef.current = new WebSocket(webSocketUrl); // Replace with your WS_URL
    
    wsRef.current.onopen = () => {
      // Join the space once connected
      wsRef.current.send(JSON.stringify({
        type: 'join',
        payload: {
          spaceId,
          token
        }
      }));
    };

    spaceAPI.getById(spaceId)
    .then(sp => {
    const [length, breadth] = sp.dimensions.split('x'); // Split "100x200" into ["100", "200"]
    setLength(length); // Set length state
    setBreadth(breadth); // Set breadth state
    console.log("Length:", length, "Breadth:", breadth);
  })
  .catch(error => {
    console.error("Error fetching space:", error);
  });
    

    wsRef.current.onmessage = (event: any) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token, spaceId]);


  const acquireLocalMedia = async () => {
    if (localStream) return localStream;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setLocalStream(s);
      // attach tracks to PeerService so getOffer() will include them to the PeerConnection
      PeerService.addLocalStream(s);
      return s;
    } catch (e) {
      toast({ title: "Media error", description: "Camera/Mic permission required." });
      throw e;
    }
  };
  

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'space-joined':
        // Initialize current user position and other users
        { console.log("set")
        console.log({
            x: message.payload.spawn.x,
            y: message.payload.spawn.y,
            userId: message.payload.userId
          })
        
        
        setx(Math.floor(Math.random() * breadth));  
        sety(Math.floor(Math.random() * length));
          
        setCurrentUser({
          x: x,
          y: y,
          userId: message.payload.userId
        });
        
        toast({
          title: 'Joined space',
          description: `You have joined space ${message.payload.spaceId}`,
        });
        // Initialize other users from the payload
        const userMap = new Map();
        message.payload.users.forEach((user: any) => {
          userMap.set(user.userId, user);
        });
        setUsers(userMap);
        break; }

      case 'user-joined':
        setUsers(prev => {
          const newUsers = new Map(prev);
          newUsers.set(message.payload.userId, {
            x: message.payload.x,
            y: message.payload.y,
            userId: message.payload.userId
          });
          toast({
            title: 'User joined',
            description: `User ${message.payload.userId} has joined the space`,
          });
          return newUsers;
        });
        break;

      case 'movement':
        setUsers(prev => {
          const newUsers = new Map(prev);
          const user = newUsers.get(message.payload.userId);
          if (user) {
            user.x = message.payload.x;
            user.y = message.payload.y;
            newUsers.set(message.payload.userId, user);
          }
          toast({
            title: 'Movement',
            description: `You are moving to (${message.payload.x}, ${message.payload.y})`,
          });
          return newUsers;
        });
        break;

      case 'groupChat':
        setMessages(prev => [...prev, message.payload]);      
        break;

        case 'incomming:call': { // server forwards the offer to callee
          const { from, offer } = message.payload;
          // prompt user to accept - replace with nicer UI if you want
          const accept = window.confirm(`Incoming call from ${from}. Accept?`);
          if (!accept) {
            // simply ignore or send rejection if you implement it
            return;
          }
      
          // accept: prepare PeerService and local tracks, create answer and send back
          (async () => {
            await acquireLocalMedia();
            PeerService.reset();
            PeerService.addLocalStream(localStream!);
            PeerService.onIce((candidate) => {
              wsRef.current?.send(JSON.stringify({
                type: 'ice:candidate',
                payload: { to: from, candidate }
              }));
            });
            PeerService.onTrack((stream) => setRemoteStream(stream));
      
            // getAnswer will set remote description, create answer and set local desc (per your PeerService)
            const ans = await PeerService.getAnswer(offer);
            // send answer to initiator via server
            wsRef.current?.send(JSON.stringify({
              type: 'call:accepted',
              payload: { to: from, ans }
            }));
            setInCallWith(from);
          })();
          break;
        }
      
        case 'call:accepted': {
          // initiator receives answer
          const { from, ans } = message.payload;
          // set remote desc so connection finishes
          (async () => {
            await PeerService.setLocalDescription(ans); // your method sets remote desc for initiator
            setInCallWith(from);
          })();
          break;
        }
      
        case 'ice:candidate': {
          const { from, candidate } = message.payload;
          // add candidate to peer
          (async () => {
            if (candidate) {
              await PeerService.addIceCandidate(candidate);
            }
          })();
          break;
        }
      
        // optional: peer negotiation events (peer:nego:needed / peer:nego:final)
        case 'peer:nego:needed': {
          // remote wants to renegotiate (e.g., device change)
          const { from, offer } = message.payload;
          (async () => {
            // create answer for the renegotiation offer
            const ans = await PeerService.getAnswer(offer);
            wsRef.current?.send(JSON.stringify({
              type: 'peer:nego:done',
              payload: { to: from, ans }
            }));
          })();
          break;
        }
      
        case 'peer:nego:final': {
          // final answer for renegotiation
          const { from, ans } = message.payload;
          (async () => {
            await PeerService.setLocalDescription(ans);
          })();
          break;
        }
      
         
      

      case 'movement-rejected':
        // Reset current user position if movement was rejected
        setCurrentUser((prev: any) => ({
          ...prev,
          x: message.payload.x,
          y: message.payload.y
        }));
        toast({
          title: 'Movement rejected',
          description: `You cannot move to (${message.payload.x}, ${message.payload.y})`,
        })
        break;

      case 'user-left':
        setUsers(prev => {
          const newUsers = new Map(prev);
          newUsers.delete(message.payload.userId);
          return newUsers;
        });
        toast({
          title: 'User left',
          description: `User ${message.payload.userId} has left the space`,
        });
        break;
    }
  };

  const startCall = async (otherId: string) => {
    try {
      await acquireLocalMedia();
      // reset previous peer (optional)
      PeerService.reset();
      // register callbacks for ICE and ontrack
      PeerService.onIce((candidate) => {
        // send candidate to the remote via WS
        wsRef.current?.send(JSON.stringify({
          type: 'ice:candidate',
          payload: { to: otherId, candidate }
        }));
      });
      PeerService.onTrack((stream) => {
        setRemoteStream(stream);
      });
  
      const offer = await PeerService.getOffer();
      // send offer to server -> server forwards as "incomming:call"
      wsRef.current?.send(JSON.stringify({
        type: 'user:call',
        payload: { to: otherId, offer }
      }));
  
      // remember we initiated a call
      pendingCallRef.current = { to: otherId };
    } catch (e) {
      console.error("startCall failed", e);
    }
  };
  
  const endCall = () => {
    // reset peer
    PeerService.reset();
    // stop local tracks
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setInCallWith(null);
    pendingCallRef.current = null;
    // optionally inform peer via web socket if you want a "call-ended" event
  };

  
  useEffect(() => {
    if (!currentUser || !currentUser.userId) return;
    users.forEach((user, id) => {
      if (inCallWith === id) return; // already in call
      const dist = distanceBetween(currentUser, user);
      if (dist <= proximityThreshold) {
        // use deterministic initiator selection to avoid double invites
        const myId = String(currentUser.id || currentUser.userId); // ensure you use the server id (this.id)
        const otherId = String(id);
        const initiator = myId < otherId ? myId : otherId;
        if (myId === initiator) {
          // initiator triggers the call
          startCall(otherId);
        }
      }
    });
  }, [users, currentUser]);
  
  const handleSendMessage = (text: string) => {
    if (!currentUser || !spaceId || !text.trim()) return;

    const newMsg = { userId: currentUser.userId, message: text, timestamp: Date.now() };//new object bana rha hai kyu?
    setMessages(prev => [...prev, newMsg]);

    wsRef.current?.send(JSON.stringify({
      type: 'groupChat',
      payload: {
        userId: currentUser.userId,
        message: text,
        groupId: spaceId,
        timestamp: newMsg.timestamp,
      }
    }));
  };

  // Handle user movement
  const handleMove = (newX: any, newY: any) => {
    if (!currentUser) return;
    
    // Send movement request
    wsRef.current.send(JSON.stringify({
      type: 'move',
      payload: {
        x: newX,
        y: newY,
        userId: currentUser.userId
      }
    }));
  };

  // Draw the arena
  useEffect(() => {
    console.log("render")
    const canvas = canvasRef.current;
    if (!canvas) return;
    console.log("below render")
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#eee';
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    console.log("before curerntusert")
    console.log(currentUser)
    // Draw current user
    if (currentUser && currentUser.x) {
        console.log("drawing myself")
        console.log(currentUser)
      ctx.beginPath();
      ctx.fillStyle = '#FF6B6B';
      ctx.arc(currentUser.x * 50, currentUser.y * 50, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('You', currentUser.x * 50, currentUser.y * 50 + 40);
    }

    // Draw other users
    users.forEach(user => {
    if (!user.x) {
        return
    }
    console.log("drawing other user")
    console.log(user)
      ctx.beginPath();
      ctx.fillStyle = '#4ECDC4';
      ctx.arc(user.x * 50, user.y * 50, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`User ${user.userId}`, user.x * 50, user.y * 50 + 40);
    });
  }, [currentUser, users]);

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
    }
  };

  if ( !spaceId) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Space Not Found</h2>
            <p className="text-muted-foreground mb-6">
             
            </p>
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
      <p className="text-sm text-gray-600">Token: {token}</p>
      <p className="text-sm text-gray-600">Space ID: {spaceId}</p>
      <p className="text-sm text-gray-600">
        Connected Users: {users.size + (currentUser ? 1 : 0)}
      </p>
      <div className="flex gap-2">
        <Button onClick={() => setChatOpen(true)}>Open Chat</Button>
        {inCallWith && (
          <Button
            variant="destructive"
            onClick={endCall}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            End Call
          </Button>
        )}
      </div>
    </div>

    <div className="border rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={length * 50}
        height={breadth * 50}
        className="bg-white"
      />
    </div>
    <p className="mt-2 text-sm text-gray-500">Use arrow keys to move your avatar</p>

    {/* ✅ Floating Chat Window */}
    {chatOpen && (
      <div className="fixed bottom-4 right-4 w-80 bg-white shadow-xl rounded-xl flex flex-col border border-gray-200 z-50">
        {/* Header */}
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-64 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {messages.length === 0 && (
            <p className="text-center text-gray-400 text-sm">No messages yet</p>
          )}
          {messages.map((msg, idx) => {
            const isMe = msg.userId === currentUser.userId;
            return (
              <div
                key={idx}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] px-3 py-2 rounded-lg shadow-sm ${
                    isMe
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-gray-100 text-gray-800 rounded-bl-none"
                  }`}
                >
                  <p className="text-xs font-semibold opacity-80 mb-0.5">
                    {isMe ? "You" : `User ${msg.userId}`}
                  </p>
                  <p className="text-sm leading-snug">{msg.message}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="flex items-center p-2 border-t bg-gray-50 gap-2">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border-gray-300"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSendMessage(chatInput);
                setChatInput("");
              }
            }}
          />
          <Button
            onClick={() => {
              handleSendMessage(chatInput);
              setChatInput("");
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Send
          </Button>
        </div>
      </div>
    )}

    {/* ✅ Floating Video Call Window */}
    {inCallWith && (
      <div className="fixed bottom-4 left-4 w-96 bg-white shadow-xl rounded-xl border border-gray-200 z-50 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-2 border-b bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-xl">
          <h2 className="font-semibold">Video Call with {inCallWith}</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={endCall}
          >
            <X size={16} />
          </Button>
        </div>

        {/* Video Streams */}
        <div className="relative bg-black h-64">
          {remoteStream ? (
            <video
              autoPlay
              playsInline
              ref={(video) => {
                if (video && remoteStream) {
                  video.srcObject = remoteStream;
                }
              }}
              className="w-full h-full object-cover"
            />
          ) : (
            <p className="text-center text-gray-400 mt-24">Waiting for remote video...</p>
          )}

          {/* Local video in corner */}
          {localStream && (
            <video
              autoPlay
              muted
              playsInline
              ref={(video) => {
                if (video && localStream) {
                  video.srcObject = localStream;
                }
              }}
              className="absolute bottom-2 right-2 w-28 h-20 rounded-md border-2 border-white object-cover shadow-lg"
            />
          )}
        </div>
      </div>
    )}
  </div>

  );
};

export default Office;