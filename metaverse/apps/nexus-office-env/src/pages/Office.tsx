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

const Office = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
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
  // Add camera offset state for following the user
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();

  const token = localStorage.getItem('token') || '';

  const webSocketUrl = import.meta.env.VITE_WS_URL;
  
  // Constants for canvas and grid
  const GRID_SIZE = 50;
  const CANVAS_WIDTH = 800; // Fixed canvas viewport width
  const CANVAS_HEIGHT = 600; // Fixed canvas viewport height

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

  // Function to update camera to follow current user
  const updateCamera = (userX: number, userY: number) => {
    const newCameraX = (userX * GRID_SIZE) - (CANVAS_WIDTH / 2);
    const newCameraY = (userY * GRID_SIZE) - (CANVAS_HEIGHT / 2);
    
    setCameraOffset({ x: newCameraX, y: newCameraY });
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
        
        const newX = Math.floor(Math.random() * breadth);  
        const newY = Math.floor(Math.random() * length);
        
        setx(newX);  
        sety(newY);
          
        const newUser = {
          x: newX,
          y: newY,
          userId: message.payload.userId
        };
        
        setCurrentUser(newUser);
        
        // Update camera to focus on the new user
        updateCamera(newX, newY);
        
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
        // Check if this is the current user's movement
        if (message.payload.userId === currentUser.userId) {
          setCurrentUser(prev => ({
            ...prev,
            x: message.payload.x,
            y: message.payload.y
          }));
          // Update camera to follow the current user
          updateCamera(message.payload.x, message.payload.y);
        } else {
          // Update other users
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
        }
        toast({
          title: 'Movement',
          description: `You are moving to (${message.payload.x}, ${message.payload.y})`,
        });
        break;

      case 'groupChat':
        setMessages(prev => [...prev, message.payload]);      
        break;
      

      case 'movement-rejected':
        // Reset current user position if movement was rejected
        setCurrentUser((prev: any) => ({
          ...prev,
          x: message.payload.x,
          y: message.payload.y
        }));
        // Update camera for rejected movement too
        updateCamera(message.payload.x, message.payload.y);
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

  // Draw the arena with camera offset
  useEffect(() => {
    console.log("render")
    const canvas = canvasRef.current;
    if (!canvas) return;
    console.log("below render")
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save the current context state
    ctx.save();
    
    // Apply camera transformation
    ctx.translate(-cameraOffset.x, -cameraOffset.y);

    // Draw grid with camera offset
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    
    // Calculate visible grid range
    const startX = Math.floor(cameraOffset.x / GRID_SIZE) * GRID_SIZE;
    const endX = startX + CANVAS_WIDTH + GRID_SIZE;
    const startY = Math.floor(cameraOffset.y / GRID_SIZE) * GRID_SIZE;
    const endY = startY + CANVAS_HEIGHT + GRID_SIZE;
    
    // Draw vertical grid lines
    for (let i = startX; i <= endX; i += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, Math.max(0, startY));
      ctx.lineTo(i, Math.min(length * GRID_SIZE, endY));
      ctx.stroke();
    }
    
    // Draw horizontal grid lines
    for (let i = startY; i <= endY; i += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(Math.max(0, startX), i);
      ctx.lineTo(Math.min(breadth * GRID_SIZE, endX), i);
      ctx.stroke();
    }

    // Draw world boundaries
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, breadth * GRID_SIZE, length * GRID_SIZE);

    console.log("before curerntusert")
    console.log(currentUser)
    // Draw current user
    if (currentUser && currentUser.x !== undefined) {
        console.log("drawing myself")
        console.log(currentUser)
      ctx.beginPath();
      ctx.fillStyle = '#FF6B6B';
      ctx.arc(currentUser.x * GRID_SIZE, currentUser.y * GRID_SIZE, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('You', currentUser.x * GRID_SIZE, currentUser.y * GRID_SIZE + 40);
    }

    // Draw other users
    users.forEach(user => {
    if (user.x === undefined) {
        return
    }
    console.log("drawing other user")
    console.log(user)
      ctx.beginPath();
      ctx.fillStyle = '#4ECDC4';
      ctx.arc(user.x * GRID_SIZE, user.y * GRID_SIZE, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`User ${user.userId}`, user.x * GRID_SIZE, user.y * GRID_SIZE + 40);
    });
    
    // Restore the context state
    ctx.restore();
  }, [currentUser, users, cameraOffset, length, breadth]);

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
        <p className="text-sm text-gray-600">Connected Users: {users.size + (currentUser ? 1 : 0)}</p>
        <p className="text-sm text-gray-600">Position: ({currentUser.x}, {currentUser.y})</p>
        <Button onClick={() => setChatOpen(true)}>Open Chat</Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
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

export default Office;