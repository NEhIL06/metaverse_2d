import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, ArrowLeft, MessageCircle, Users, Wifi, WifiOff } from 'lucide-react';
import type { Space } from '@/types/space';

interface OfficeHeaderProps {
  space: Space;
  isConnected: boolean;
  userCount: number;
  onToggleChat: () => void;
  showChat: boolean;
}

export function OfficeHeader({ space, isConnected, userCount, onToggleChat, showChat }: OfficeHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="h-16 border-b bg-card/95 backdrop-blur-sm flex items-center justify-between px-4 z-10">
      {/* Left Side */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/dashboard')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Button>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">{space.name}</h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {space.dimensions}
              </Badge>
              <div className="flex items-center gap-1">
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-success" />
                    <span className="text-xs text-success">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-destructive" />
                    <span className="text-xs text-destructive">Disconnected</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{userCount}</span>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {userCount === 1 ? 'user' : 'users'}
          </span>
        </div>

        <Button
          variant={showChat ? "default" : "outline"}
          size="sm"
          onClick={onToggleChat}
          className="gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Chat</span>
        </Button>
      </div>
    </header>
  );
}