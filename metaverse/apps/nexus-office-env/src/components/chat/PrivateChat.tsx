import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, X, MessageSquare } from 'lucide-react';

interface PrivateChatProps {
  userId: string;
  onSendMessage: (message: string) => void;
  onClose: () => void;
}

export function PrivateChat({ userId, onSendMessage, onClose }: PrivateChatProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{
    id: string;
    message: string;
    timestamp: number;
    isOwn: boolean;
  }>>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      
      // Add to local messages for display
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        message: message.trim(),
        timestamp: Date.now(),
        isOwn: true,
      }]);
      
      setMessage('');
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-accent rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-accent-foreground" />
            </div>
            Private Chat
          </DialogTitle>
          <DialogDescription>
            Private conversation with {userId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Messages Area */}
          <div className="h-64 border rounded-lg p-3 overflow-y-auto bg-muted/20">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Start a private conversation</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <Avatar className="w-6 h-6 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-gradient-primary text-primary-foreground">
                        {msg.isOwn ? 'Y' : userId[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 ${msg.isOwn ? 'text-right' : 'text-left'}`}>
                      <div
                        className={`inline-block px-3 py-1 rounded-lg text-sm max-w-[180px] ${
                          msg.isOwn
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {msg.message}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="Type a private message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1"
              autoFocus
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!message.trim()}
              variant="accent"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>

          <div className="text-xs text-muted-foreground text-center">
            Messages are not stored and will be lost when you close this chat
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}