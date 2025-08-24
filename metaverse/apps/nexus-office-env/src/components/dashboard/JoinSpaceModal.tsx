import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Users, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface JoinSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinSpaceModal({ isOpen, onClose }: JoinSpaceModalProps) {
  const [spaceId, setSpaceId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleJoinSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!spaceId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid space ID",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    
    try {
      // Navigate directly to the office page with the space ID
      // The Office component will handle validation and loading
      navigate(`/office/${spaceId.trim()}`);
      onClose();
      
      toast({
        title: "Joining space...",
        description: "Loading the virtual office space",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join space. Please check the space ID and try again.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleClose = () => {
    if (!isJoining) {
      setSpaceId('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gradient-card border-0 shadow-xl">
        <DialogHeader className="text-center">
          <div className="w-12 h-12 bg-gradient-accent rounded-xl flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Users className="w-6 h-6 text-accent-foreground" />
          </div>
          <DialogTitle className="text-xl">Join Virtual Space</DialogTitle>
          <DialogDescription>
            Enter the space ID to join an existing virtual office space
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleJoinSpace} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="spaceId">Space ID</Label>
            <Input
              id="spaceId"
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              placeholder="Enter space ID (e.g., abc123def456)"
              disabled={isJoining}
              className="bg-background/50"
            />
            <p className="text-xs text-muted-foreground">
              Ask the space creator to share their space ID with you
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isJoining}
              className="order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isJoining || !spaceId.trim()}
              className="order-1 sm:order-2 gap-2"
            >
              {isJoining ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Join Space
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}