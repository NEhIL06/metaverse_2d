import React, { ReactNode, useRef, useEffect } from "react";
import { SocketContext } from "./context";

interface SocketProviderProps {
  children: ReactNode;
  webSocketUrl: string;
  spaceId: string;
  token: string;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ 
  children, 
  webSocketUrl, 
  spaceId, 
  token 
}) => {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!webSocketUrl) {
      console.log("No webSocketUrl");
      return;
    }

    wsRef.current = new WebSocket(webSocketUrl);
    
    wsRef.current.onopen = () => {
      wsRef.current?.send(JSON.stringify({
        type: 'join',
        payload: {
          spaceId,
          token
        }
      }));
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [webSocketUrl, spaceId, token]);

  return (
    <SocketContext.Provider value={wsRef.current}>
      {children}
    </SocketContext.Provider>
  );
};