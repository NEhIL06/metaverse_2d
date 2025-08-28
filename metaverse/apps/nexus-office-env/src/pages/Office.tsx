/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { spaceAPI } from '@/lib/api';
import Dashboard from './Dashboard';
import { GroupChat } from '@/components/chat/GroupChat';

const Office = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { toast } = useToast();
  const canvasRef = useRef<any>(null);
  const wsRef = useRef<any>(null);
  const [currentUser, setCurrentUser] = useState<any>({});
  const [users, setUsers] = useState(new Map());
  const [length, setLength] = useState<any>('');
  const [breadth, setBreadth] = useState<any>('');
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
        setCurrentUser({
          x: message.payload.spawn.x,
          y: message.payload.spawn.y,
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

  const handleSendMessage = (message: string) => {
    if (!currentUser) return;

    // Send chat message
    wsRef.current.send(JSON.stringify({
      type: 'groupChat',
      payload: {
        message,
        groupId: spaceId,
      }
    }));
  }
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
          <p className="text-sm text-gray-600">Connected Users: {users.size + (currentUser ? 1 : 0)}</p>
          {/* <GroupChat
          currentUserId={currentUser.userId}
          onSendMessage={handleSendMessage()}
          spaceId={spaceId}
          /> */}
        </div>
        <div className="border rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={length*50}
            height={breadth*50}
            className="bg-white"
          />
        </div>
        
        <p className="mt-2 text-sm text-gray-500">Use arrow keys to move your avatar</p>
    </div>
  );
};

export default Office;