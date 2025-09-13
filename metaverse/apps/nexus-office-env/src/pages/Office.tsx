/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, X, MessageCircle, Users, Send, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { spaceAPI } from '@/lib/api';
import Dashboard from './Dashboard';
import { GroupChat } from '@/components/chat/GroupChat';
import { set } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const Office = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { toast } = useToast();
  const canvasRef = useRef<any>(null);
  const wsRef = useRef<any>(null);
  const chatScrollRef = useRef<any>(null);
  const [currentUser, setCurrentUser] = useState<any>({});
  const [users, setUsers] = useState(new Map());
  const [length, setLength] = useState<any>('');
  const [breadth, setBreadth] = useState<any>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatExpanded, setChatExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const token = localStorage.getItem('token') || '';

  const webSocketUrl = import.meta.env.VITE_WS_URL;

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize WebSocket connection and handle URL params
  useEffect(() => {
    if(!webSocketUrl) {
      console.log("No webSocketUrl")
      return
    }
    wsRef.current = new WebSocket(webSocketUrl);
    
    wsRef.current.onopen = () => {
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
        const [length, breadth] = sp.dimensions.split('x');
        setLength(length);
        setBreadth(breadth);
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

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'space-joined':
        {
          console.log("set")
          console.log({
            x: message.payload.spawn.x,
            y: message.payload.spawn.y,
            userId: message.payload.userId
          })
          setCurrentUser({
            x: message.payload.spawn.x,
            y: message.payload.spawn.y,
            userId: message.payload.userId
          });
          
          toast({
            title: 'Welcome to the arena! 🎉',
            description: `Successfully joined space ${message.payload.spaceId}`,
          });
          
          const userMap = new Map();
          message.payload.users.forEach((user: any) => {
            userMap.set(user.userId, user);
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
            title: '👋 New user joined',
            description: `User ${message.payload.userId} entered the arena`,
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
        if (!chatOpen) {
          setUnreadCount(prev => prev + 1);
        }
        break;

      case 'movement-rejected':
        setCurrentUser((prev: any) => ({
          ...prev,
          x: message.payload.x,
          y: message.payload.y
        }));
        toast({
          title: '🚫 Movement blocked',
          description: `Cannot move to (${message.payload.x}, ${message.payload.y}) - position occupied`,
          variant: 'destructive'
        })
        break;

      case 'user-left':
        setUsers(prev => {
          const newUsers = new Map(prev);
          newUsers.delete(message.payload.userId);
          return newUsers;
        });
        toast({
          title: '👋 User left',
          description: `User ${message.payload.userId} has left the arena`,
        });
        break;
    }
  };

  const handleSendMessage = (text: string) => {
    if (!currentUser || !spaceId || !text.trim()) return;

    const newMsg = { userId: currentUser.userId, message: text, timestamp: Date.now() };
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

  const handleMove = (newX: any, newY: any) => {
    if (!currentUser) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'move',
      payload: {
        x: newX,
        y: newY,
        userId: currentUser.userId
      }
    }));
  };

  const openChat = () => {
    setChatOpen(true);
    setUnreadCount(0);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  // Draw the arena with enhanced visuals
  useEffect(() => {
    console.log("render")
    const canvas = canvasRef.current;
    if (!canvas) return;
    console.log("below render")
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw enhanced grid with subtle gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= canvas.height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw current user with enhanced styling
    if (currentUser && currentUser.x !== undefined) {
      console.log("drawing myself")
      console.log(currentUser)
      
      const centerX = currentUser.x * 50 + 25;
      const centerY = currentUser.y * 50 + 25;
      
      // Shadow
      ctx.beginPath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.arc(centerX + 2, centerY + 2, 22, 0, Math.PI * 2);
      ctx.fill();
      
      // Main avatar
      ctx.beginPath();
      ctx.fillStyle = '#3b82f6';
      ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
      ctx.fill();
      
      // Border
      ctx.beginPath();
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 3;
      ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
      ctx.stroke();
      
      // Label with background
      ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
      ctx.fillRect(centerX - 15, centerY + 28, 30, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('YOU', centerX, centerY + 39);
    }

    // Draw other users with enhanced styling
    users.forEach(user => {
      if (user.x === undefined) return;
      
      console.log("drawing other user")
      console.log(user)
      
      const centerX = user.x * 50 + 25;
      const centerY = user.y * 50 + 25;
      
      // Shadow
      ctx.beginPath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.arc(centerX + 2, centerY + 2, 22, 0, Math.PI * 2);
      ctx.fill();
      
      // Main avatar
      ctx.beginPath();
      ctx.fillStyle = '#10b981';
      ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
      ctx.fill();
      
      // Border
      ctx.beginPath();
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 3;
      ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
      ctx.stroke();
      
      // Label with background
      const userId = user.userId.toString().slice(-4);
      const labelWidth = userId.length * 8 + 8;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.fillRect(centerX - labelWidth/2, centerY + 28, labelWidth, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`#${userId}`, centerX, centerY + 39);
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

  if (!spaceId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Space Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The requested space could not be found or accessed.
            </p>
            <Button onClick={() => navigate('/dashboard')} variant="default">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalUsers = users.size + (currentUser ? 1 : 0);
  const chatHeight = chatExpanded ? 'h-96' : 'h-80';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Virtual Arena</h1>
              <p className="text-sm text-slate-500">Space ID: {spaceId}</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="flex items-center gap-2">
                <Users size={14} />
                {totalUsers} {totalUsers === 1 ? 'User' : 'Users'} Online
              </Badge>
              <Button 
                onClick={openChat}
                variant="outline" 
                size="sm"
                className="relative"
              >
                <MessageCircle size={16} className="mr-2" />
                Chat
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4" onKeyDown={handleKeyDown} tabIndex={0}>
        {/* Arena */}
        <Card className="shadow-lg">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Arena Grid</h2>
                <div className="text-sm text-slate-600">
                  Dimensions: {length} × {breadth} units
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="border-2 border-slate-200 rounded-lg overflow-hidden shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={length * 50}
                  height={breadth * 50}
                  className="bg-white block"
                />
              </div>
              <div className="mt-4 flex items-center justify-center">
                <div className="bg-slate-100 rounded-lg px-4 py-2 text-sm text-slate-600">
                  <span className="font-medium">💡 Tip:</span> Use arrow keys to move your avatar around the arena
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Floating Chat Window */}
      {chatOpen && (
        <div className={`fixed bottom-4 right-4 w-96 bg-white shadow-2xl rounded-xl flex flex-col border border-slate-200 z-50 transition-all duration-200 ${chatHeight}`}>
          {/* Chat Header */}
          <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} className="text-blue-600" />
              <h2 className="font-semibold text-slate-800">Group Chat</h2>
              <Badge variant="outline" className="text-xs">
                {totalUsers} online
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setChatExpanded(!chatExpanded)}
                className="h-8 w-8 p-0"
              >
                {chatExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setChatOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X size={14} />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50"
          >
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-8">
                <MessageCircle size={24} className="mx-auto mb-2 opacity-50" />
                No messages yet. Start a conversation!
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isOwnMessage = msg.userId === currentUser.userId;
                return (
                  <div
                    key={idx}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-2xl shadow-sm ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-white text-slate-800 rounded-bl-md border border-slate-200'
                      }`}
                    >
                      {!isOwnMessage && (
                        <p className="text-xs opacity-70 mb-1">
                          User #{msg.userId.toString().slice(-4)}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                      <p className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-slate-400'}`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-slate-200 bg-white rounded-b-xl">
            <div className="flex items-center gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 border-slate-200 focus:border-blue-400 focus:ring-blue-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (chatInput.trim()) {
                      handleSendMessage(chatInput);
                      setChatInput('');
                    }
                  }
                }}
              />
              <Button
                onClick={() => {
                  if (chatInput.trim()) {
                    handleSendMessage(chatInput);
                    setChatInput('');
                  }
                }}
                size="sm"
                className="h-9 px-3"
                disabled={!chatInput.trim()}
              >
                <Send size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Office;