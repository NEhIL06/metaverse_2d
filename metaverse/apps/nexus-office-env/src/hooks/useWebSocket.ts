// import { useState, useEffect, useRef, useCallback } from 'react';
// import type { 
//   WebSocketMessage, 
//   ChatMessage,
//   SpaceJoinedResponse,
//   UserJoinedResponse,
//   MovementResponse,
//   MovementRejectedResponse,
//   UserLeftResponse
// } from '@/types/websocket';
// import type { UserPosition } from '@/types/space';

// const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

// interface UseWebSocketProps {
//   spaceId?: string;
//   token?: string;
//   onUserJoined?: (user: UserJoinedResponse['payload']) => void;
//   onUserLeft?: (user: UserLeftResponse['payload']) => void;
//   onMovement?: (movement: MovementResponse['payload']) => void;
//   onMovementRejected?: (position: MovementRejectedResponse['payload']) => void;
//   onGroupChat?: (message: ChatMessage) => void;
//   onPrivateChat?: (message: ChatMessage) => void;
// }

// export function useWebSocket({
//   spaceId,
//   token,
//   onUserJoined,
//   onUserLeft,
//   onMovement,
//   onMovementRejected,
//   onGroupChat,
//   onPrivateChat,
// }: UseWebSocketProps) {
//   const [ws, setWs] = useState<WebSocket | null>(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [users, setUsers] = useState<UserPosition[]>([]);
//   const [userPosition, setUserPosition] = useState<{ x: number; y: number } | null>(null);
//   const [messages, setMessages] = useState<ChatMessage[]>([]);
//   const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

//   const connect = useCallback(() => {
//     if (!spaceId || !token) return;

//     const websocket = new WebSocket(WS_URL);
    
//     websocket.onopen = () => {
//       setIsConnected(true);
//       setWs(websocket);
      
//       // Join the space
//       websocket.send(JSON.stringify({
//         type: 'join',
//         payload: {
//           spaceId,
//           token,
//         },
//       }));
//     };

//     websocket.onmessage = (event) => {
//       try {
//         const message: WebSocketMessage = JSON.parse(event.data);
        
//         switch (message.type) {
//           case 'space-joined':
//             { const spaceJoined = message as SpaceJoinedResponse;
//             setUserPosition(spaceJoined.payload.spawn);
//             setUsers(spaceJoined.payload.users.map(u => ({
//               userId: u.userId,
//               x: u.x,
//               y: u.y,
//             })));
//             break; }
            
//           case 'user-joined':
//             { const userJoined = message as UserJoinedResponse;
//             setUsers(prev => [...prev, {
//               userId: userJoined.payload.userId,
//               x: userJoined.payload.x,
//               y: userJoined.payload.y,
//             }]);
//             onUserJoined?.(userJoined.payload);
//             break; }
            
//           case 'user-left':
//             { const userLeft = message as UserLeftResponse;
//             setUsers(prev => prev.filter(u => u.userId !== userLeft.payload.userId));
//             onUserLeft?.(userLeft.payload);
//             break; }
            
//           case 'movement':
//             { const movement = message as MovementResponse;
//             setUsers(prev => prev.map(u => 
//               u.userId === movement.payload.userId
//                 ? { ...u, x: movement.payload.x, y: movement.payload.y }
//                 : u
//             ));
//             onMovement?.(movement.payload);
//             break; }
            
//           case 'movement-rejected':
//             { const rejected = message as MovementRejectedResponse;
//             setUserPosition({ x: rejected.payload.x, y: rejected.payload.y });
//             onMovementRejected?.(rejected.payload);
//             break; }
            
//           case 'groupChat':
//             { const groupChat: ChatMessage = {
//               id: Date.now().toString(),
//               message: message.payload.message,
//               userId: message.payload.userId || 'unknown',
//               username: message.payload.username,
//               timestamp: Date.now(),
//             };
//             setMessages(prev => [...prev, groupChat]);
//             onGroupChat?.(groupChat);
//             break; }
            
//           case 'privateChat':
//             { const privateChat: ChatMessage = {
//               id: Date.now().toString(),
//               message: message.payload.message,
//               userId: message.payload.userId || 'unknown',
//               username: message.payload.username,
//               timestamp: Date.now(),
//             };
//             onPrivateChat?.(privateChat);
//             break; }
//         }
//       } catch (error) {
//         console.error('Error parsing WebSocket message:', error);
//       }
//     };

//     websocket.onclose = () => {
//       setIsConnected(false);
//       setWs(null);
      
//       // Attempt to reconnect after 3 seconds
//       reconnectTimeoutRef.current = setTimeout(connect, 3000);
//     };

//     websocket.onerror = (error) => {
//       console.error('WebSocket error:', error);
//     };

//     return websocket;
//   }, [spaceId, token, onUserJoined, onUserLeft, onMovement, onMovementRejected, onGroupChat, onPrivateChat]);

//   useEffect(() => {
//     const websocket = connect();
    
//     return () => {
//       if (reconnectTimeoutRef.current) {
//         clearTimeout(reconnectTimeoutRef.current);
//       }
//       websocket?.close();
//     };
//   }, [connect]);

//   const move = useCallback((x: number, y: number) => {
//     if (ws && isConnected) {
//       ws.send(JSON.stringify({
//         type: 'move',
//         payload: { x, y },
//       }));
//     }
//   }, [ws, isConnected]);

//   const sendGroupMessage = useCallback((message: string) => {
//     if (ws && isConnected && spaceId) {
//       ws.send(JSON.stringify({
//         type: 'groupChat',
//         payload: {
//           message,
//           groupId: spaceId,
//         },
//       }));
//     }
//   }, [ws, isConnected, spaceId]);

//   const sendPrivateMessage = useCallback((message: string, userId: string) => {
//     if (ws && isConnected && spaceId) {
//       ws.send(JSON.stringify({
//         type: 'privateChat',
//         payload: {
//           message,
//           userId,
//           spaceId,
//         },
//       }));
//     }
//   }, [ws, isConnected, spaceId]);

//   return {
//     isConnected,
//     users,
//     userPosition,
//     messages,
//     move,
//     sendGroupMessage,
//     sendPrivateMessage,
//   };
// }