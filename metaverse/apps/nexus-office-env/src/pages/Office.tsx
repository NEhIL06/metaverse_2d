/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, X, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { spaceAPI } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { useSocket } from './context/socket';
import { SocketProvider } from './context/socketprovider';
import peer from './service/peer';

const OfficeContent = () => {
  // Video chat states
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callState, setCallState] = useState("idle"); // idle, calling, connected
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Queue for ICE candidates received before remote description is set
  const [iceCandidateQueue, setIceCandidateQueue] = useState<any[]>([]);
  
  // Existing states
  const { spaceId } = useParams<{ spaceId: string }>();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socket = useSocket();
  const [currentUser, setCurrentUser] = useState<any>({});
  const [users, setUsers] = useState(new Map());
  const [length, setLength] = useState<number>(0);
  const [breadth, setBreadth] = useState<number>(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [x, setx] = useState(0);
  const [y, sety] = useState(0);
  const navigate = useNavigate();

  // Process queued ICE candidates when remote description is set
  const processQueuedIceCandidates = useCallback(async () => {
    if (iceCandidateQueue.length > 0 && peer.peer.remoteDescription) {
      console.log(`Processing ${iceCandidateQueue.length} queued ICE candidates`);
      for (const candidate of iceCandidateQueue) {
        try {
          await peer.peer.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("Added queued ICE candidate");
        } catch (error) {
          console.error("Error adding queued ICE candidate:", error);
        }
      }
      setIceCandidateQueue([]);
    }
  }, [iceCandidateQueue]);

  // Video chat handlers
  const handleCallUser = useCallback(async (targetUserId: string, audioOnly = false) => {
    try {
      console.log("Starting call...");
      setCallState("calling");
      setRemoteSocketId(targetUserId);
      
      // Get user media with error handling
      let stream: MediaStream;
      const constraints = {
        audio: true,
        video: !audioOnly,
      };
      
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log(audioOnly ? "Got audio-only stream:" : "Got local stream:", stream);
      } catch (mediaError) {
        console.warn("Camera might be in use, trying audio only:", mediaError);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          console.log("Fallback to audio-only stream:", stream);
        } catch (audioError) {
          console.error("Failed to get any media:", audioError);
          throw audioError;
        }
      }
      
      setMyStream(stream);

      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        console.log(`Adding track: ${track.kind}`, track);
        peer.peer.addTrack(track, stream);
      });

      // Create and send offer
      const offer = await peer.getOffer();
      console.log("Sending offer:", offer);
      
      socket?.send(JSON.stringify({
        type: "user:call",
        payload: { to: targetUserId, offer }
      }));
      
    } catch (error) {
      console.error("Error in handleCallUser:", error);
      setCallState("idle");
    }
  }, [socket]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }: { from: string, offer: RTCSessionDescriptionInit }) => {
      try {
        console.log("Incoming call from:", from);
        console.log("Received offer:", offer);
        setRemoteSocketId(from);
        setCallState("calling");
        
        // Get user media with error handling for camera conflicts
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });
          console.log("Got local stream for answer:", stream);
        } catch (mediaError) {
          console.warn("Camera might be in use, trying audio only:", mediaError);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false,
            });
            console.log("Got audio-only stream for answer:", stream);
          } catch (audioError) {
            console.error("Failed to get any media:", audioError);
            throw audioError;
          }
        }
        
        setMyStream(stream);

        // Add tracks to peer connection
        stream.getTracks().forEach(track => {
          console.log(`Adding track for answer: ${track.kind}`, track);
          peer.peer.addTrack(track, stream);
        });

        // Create and send answer
        const ans = await peer.getAnswer(offer);
        console.log("Sending answer:", ans);
        
        socket?.send(JSON.stringify({
          type: "call:accepted",
          payload: { to: from, ans }
        }));
        
        // Process any queued ICE candidates
        setTimeout(() => processQueuedIceCandidates(), 100);
        
      } catch (error) {
        console.error("Error in handleIncommingCall:", error);
        setCallState("idle");
      }
    },
    [socket, processQueuedIceCandidates]
  );

  const handleCallAccepted = useCallback(
    async ({ ans }: { ans: RTCSessionDescriptionInit }) => {
      try {
        console.log("Call accepted, received answer:", ans);
        await peer.setLocalDescription(ans);
        setCallState("connected");
        
        // Process any queued ICE candidates
        setTimeout(() => processQueuedIceCandidates(), 100);
      } catch (error) {
        console.error("Error in handleCallAccepted:", error);
      }
    },
    [processQueuedIceCandidates]
  );

  const handleIceCandidate = useCallback(
    async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        console.log("Received ICE candidate:", candidate);
        
        // Check if remote description is set
        if (peer.peer.remoteDescription && peer.peer.remoteDescription.type) {
          console.log("Adding ICE candidate immediately");
          await peer.peer.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          console.log("Queuing ICE candidate (no remote description yet)");
          setIceCandidateQueue(prev => [...prev, candidate]);
        }
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    },
    []
  );

  const handleNegoNeeded = useCallback(async () => {
    try {
      console.log("Negotiation needed");
      const offer = await peer.getOffer();
      socket?.send(JSON.stringify({
        type: "peer:nego:needed",
        payload: { offer, to: remoteSocketId }
      }));
    } catch (error) {
      console.error("Error in negotiation:", error);
    }
  }, [remoteSocketId, socket]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }: { from: string, offer: RTCSessionDescriptionInit }) => {
      try {
        console.log("Incoming negotiation from:", from);
        const ans = await peer.getAnswer(offer);
        socket?.send(JSON.stringify({
          type: "peer:nego:done",
          payload: { to: from, ans }
        }));
      } catch (error) {
        console.error("Error in incoming negotiation:", error);
      }
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }: { ans: RTCSessionDescriptionInit }) => {
    try {
      console.log("Final negotiation");
      await peer.setLocalDescription(ans);
    } catch (error) {
      console.error("Error in final negotiation:", error);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (myStream) {
      const videoTrack = myStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  }, [myStream]);

  const toggleAudio = useCallback(() => {
    if (myStream) {
      const audioTrack = myStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  }, [myStream]);

  const endCall = useCallback(() => {
    if (myStream) {
      myStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }
    setMyStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setRemoteSocketId(null);
    
    // Reset peer connection
    peer.reset();
  }, [myStream, remoteStream]);

  // Fetch space data
  useEffect(() => {
    if (!spaceId) return;
    
    spaceAPI.getById(spaceId)
    .then(sp => {
      const [length, breadth] = sp.dimensions.split('x');
      setLength(parseInt(length));
      setBreadth(parseInt(breadth));
      console.log("Length:", length, "Breadth:", breadth);
    })
    .catch(error => {
      console.error("Error fetching space:", error);
    });
  }, [spaceId]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    socket.addEventListener('message', handleMessage);

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket]);

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'space-joined':
        {
          console.log("Space joined", message.payload);
          
          setx(Math.floor(Math.random() * breadth));  
          sety(Math.floor(Math.random() * length));
            
          setCurrentUser({
            x: message.payload.spawn.x,
            y: message.payload.spawn.y,
            userId: message.payload.userId
          });
        
          toast({
            title: 'Joined space',
            description: `You have joined space ${spaceId}`,
          });
          
          const userMap = new Map();
          message.payload.users.forEach((user: any) => {
            userMap.set(user.userId || user.id, user);
          });
          setUsers(userMap);
          break;
        }

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
          return newUsers;
        });
        break;

      case 'groupChat':
        setMessages(prev => [...prev, message.payload]);      
        break;

      case 'movement-rejected':
        setCurrentUser((prev: any) => ({
          ...prev,
          x: message.payload.x,
          y: message.payload.y
        }));
        toast({
          title: 'Movement rejected',
          description: `You cannot move to (${message.payload.x}, ${message.payload.y})`,
        });
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

      // Video chat message handlers
      case 'incomming:call':
        handleIncommingCall(message.payload);
        break;

      case 'call:accepted':
        handleCallAccepted(message.payload);
        break;

      case 'peer:nego:needed':
        handleNegoNeedIncomming(message.payload);
        break;

      case 'peer:nego:final':
        handleNegoNeedFinal(message.payload);
        break;

      case 'ice:candidate':
        handleIceCandidate(message.payload);
        break;
    }
  };

  const handleSendMessage = (text: string) => {
    if (!currentUser || !spaceId || !text.trim()) return;

    const newMsg = { userId: currentUser.userId, message: text, timestamp: Date.now() };
    setMessages(prev => [...prev, newMsg]);

    socket?.send(JSON.stringify({
      type: 'groupChat',
      payload: {
        userId: currentUser.userId,
        message: text,
        groupId: spaceId,
        timestamp: newMsg.timestamp,
      }
    }));
  };

  const handleMove = (newX: number, newY: number) => {
    if (!currentUser) return;
    
    socket?.send(JSON.stringify({
      type: 'move',
      payload: {
        x: newX,
        y: newY,
        userId: currentUser.userId
      }
    }));
  };

  // Set up peer connection event listeners
  useEffect(() => {
    const pc = peer.peer;

    const handleNegotiationNeeded = () => {
      console.log("Peer negotiation needed event");
      handleNegoNeeded();
    };

    const handleIceCandidateEvent = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate && remoteSocketId) {
        console.log("Sending ICE candidate:", event.candidate);
        socket?.send(JSON.stringify({
          type: "ice:candidate",
          payload: {
            to: remoteSocketId,
            candidate: event.candidate,
          }
        }));
      } else {
        console.log("ICE gathering complete");
      }
    };

    const handleTrack = (event: RTCTrackEvent) => {
      console.log("Received remote track event:", event);
      console.log("Remote streams:", event.streams);
      if (event.streams && event.streams[0]) {
        const [stream] = event.streams;
        console.log("Setting remote stream:", stream);
        console.log("Remote stream tracks:", stream.getTracks());
        setRemoteStream(stream);
        setCallState("connected");
      }
    };

    const handleConnectionStateChange = () => {
      console.log("Connection state changed:", pc.connectionState);
    };

    const handleIceConnectionStateChange = () => {
      console.log("ICE Connection state changed:", pc.iceConnectionState);
    };

    const handleSignalingStateChange = () => {
      console.log("Signaling state changed:", pc.signalingState);
    };

    pc.addEventListener("negotiationneeded", handleNegotiationNeeded);
    pc.addEventListener("icecandidate", handleIceCandidateEvent);
    pc.addEventListener("track", handleTrack);
    pc.addEventListener("connectionstatechange", handleConnectionStateChange);
    pc.addEventListener("iceconnectionstatechange", handleIceConnectionStateChange);
    pc.addEventListener("signalingstatechange", handleSignalingStateChange);

    return () => {
      pc.removeEventListener("negotiationneeded", handleNegotiationNeeded);
      pc.removeEventListener("icecandidate", handleIceCandidateEvent);
      pc.removeEventListener("track", handleTrack);
      pc.removeEventListener("connectionstatechange", handleConnectionStateChange);
      pc.removeEventListener("iceconnectionstatechange", handleIceConnectionStateChange);
      pc.removeEventListener("signalingstatechange", handleSignalingStateChange);
    };
  }, [handleNegoNeeded, remoteSocketId, socket]);

  // Set video srcObject when streams change
  useEffect(() => {
    if (myVideoRef.current && myStream) {
      console.log("Setting my video source");
      myVideoRef.current.srcObject = myStream;
    }
  }, [myStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log("Setting remote video source");
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Draw the arena
  useEffect(() => {
    console.log("render")
    const canvas = canvasRef.current;
    if (!canvas) return;
    console.log("below render")
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
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

    console.log("before currentuser")
    console.log(currentUser)
    // Draw current user
    if (currentUser && currentUser.x !== undefined) {
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
    users.forEach((user: any) => {
      if (user.x === undefined) {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
    <div className="p-4 relative" onKeyDown={handleKeyDown} tabIndex={0}>
      <h1 className="text-2xl font-bold mb-4">Arena</h1>
      <div className="mb-4">
        <p className="text-sm text-gray-600">Space ID: {spaceId}</p>
        <p className="text-sm text-gray-600">Connected Users: {users.size + (currentUser ? 1 : 0)}</p>
        <Button onClick={() => setChatOpen(true)}>Open Chat</Button>
      </div>

      {/* Video Chat Interface - Top Left Corner */}
      <div className="fixed top-4 left-4 z-50 space-y-2">
        {/* My Video */}
        {myStream && (
          <div className="relative">
            <video 
              ref={myVideoRef}
              width="200" 
              height="150" 
              autoPlay 
              playsInline
              muted
              className="rounded-lg border-2 border-blue-500 bg-black"
            />
            <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
              You
            </div>
            <div className="absolute bottom-2 right-2 flex space-x-1">
              <Button
                size="sm"
                variant={videoEnabled ? "secondary" : "destructive"}
                onClick={toggleVideo}
                className="p-1 h-6 w-6"
              >
                {videoEnabled ? <Video size={12} /> : <VideoOff size={12} />}
              </Button>
              <Button
                size="sm"
                variant={audioEnabled ? "secondary" : "destructive"}
                onClick={toggleAudio}
                className="p-1 h-6 w-6"
              >
                {audioEnabled ? <Mic size={12} /> : <MicOff size={12} />}
              </Button>
            </div>
          </div>
        )}

        {/* Remote Video */}
        {remoteStream && (
          <div className="relative">
            <video 
              ref={remoteVideoRef}
              width="200" 
              height="150" 
              autoPlay 
              playsInline
              className="rounded-lg border-2 border-red-500 bg-black"
            />
            <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
              Remote User
            </div>
          </div>
        )}

        {/* Call Controls */}
        <div className="flex space-x-2">
          {users.size > 0 && callState === "idle" && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  const firstUser = Array.from(users.values())[0] as any;
                  handleCallUser(firstUser.userId, false);
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Video Call
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const firstUser = Array.from(users.values())[0] as any;
                  handleCallUser(firstUser.userId, true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Audio Call
              </Button>
            </>
          )}
          
          {(myStream || remoteStream) && (
            <Button
              size="sm"
              onClick={endCall}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              End Call
            </Button>
          )}
        </div>

        {/* Call State Indicator */}
        {callState !== "idle" && (
          <div className="bg-black/80 text-white px-3 py-1 rounded text-sm">
            Call State: {callState}
          </div>
        )}
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

      {/* Floating Chat Window */}
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
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
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

          {/* Input */}
          <div className="flex items-center p-2 border-t bg-gray-50 gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 border-gray-300"
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

// Main Office component wrapped with SocketProvider
const Office = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const token = localStorage.getItem('token') || '';
  const webSocketUrl = import.meta.env.VITE_WS_URL;

  if (!spaceId || !webSocketUrl) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Configuration Error</h2>
            <p className="text-muted-foreground mb-6">
              Missing space ID or WebSocket URL
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SocketProvider 
      webSocketUrl={webSocketUrl} 
      spaceId={spaceId} 
      token={token}
    >
      <OfficeContent />
    </SocketProvider>
  );
};

export default Office;