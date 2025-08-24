import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Users } from 'lucide-react';
import type { UserPosition } from '@/types/space';

interface ProximityButtonProps {
  nearbyUsers: UserPosition[];
  onStartChat: (userId: string) => void;
}

export function ProximityButton({ nearbyUsers, onStartChat }: ProximityButtonProps) {
  const [showUsers, setShowUsers] = useState(false);

  if (nearbyUsers.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-20">
      <Card className="bg-card/95 backdrop-blur-sm shadow-xl border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gradient-accent rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {nearbyUsers.length} {nearbyUsers.length === 1 ? 'user' : 'users'} nearby
              </p>
              <p className="text-xs text-muted-foreground">
                You can start a private chat
              </p>
            </div>
          </div>

          {/* Nearby Users List */}
          <div className="space-y-2">
            {nearbyUsers.slice(0, 3).map((user) => (
              <div key={user.userId} className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs bg-gradient-primary text-primary-foreground">
                    {(user.username || user.userId)[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm flex-1 truncate">
                  {user.username || user.userId}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={() => onStartChat(user.userId)}
                >
                  <MessageCircle className="w-3 h-3" />
                </Button>
              </div>
            ))}
            
            {nearbyUsers.length > 3 && (
              <div className="text-xs text-muted-foreground text-center pt-1">
                +{nearbyUsers.length - 3} more
              </div>
            )}
          </div>

          {/* Quick Chat Button for Single User */}
          {nearbyUsers.length === 1 && (
            <Button
              size="sm"
              variant="accent"
              className="w-full mt-2 gap-2"
              onClick={() => onStartChat(nearbyUsers[0].userId)}
            >
              <MessageCircle className="w-3 h-3" />
              Chat with {nearbyUsers[0].username || nearbyUsers[0].userId}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}