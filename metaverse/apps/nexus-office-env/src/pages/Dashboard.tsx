import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { spaceAPI } from '@/lib/api';
import type { Space } from '@/types/space';
import { SpaceList } from '@/components/dashboard/SpaceList';
import { CreateSpaceModal } from '@/components/dashboard/CreateSpaceModal';
import { JoinSpaceModal } from '@/components/dashboard/JoinSpaceModal';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Building2, Users, Sparkles, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    try {
      setIsLoading(true);
      const response = await spaceAPI.getAll();
      setSpaces(response.spaces);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load spaces",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpaceCreated = (newSpace: { spaceId: string; name: string; dimensions: string }) => {
    setShowCreateModal(false);
    loadSpaces(); // Reload spaces to get the new one
    toast({
      title: "Space created!",
      description: `${newSpace.name} is ready for collaboration`,
    });
  };

  const handleSpaceDeleted = async (spaceId: string) => {
    try {
      await spaceAPI.delete(spaceId);
      setSpaces(prev => prev.filter(s => s.id !== spaceId));
      toast({
        title: "Space deleted",
        description: "The space has been permanently deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete space",
        variant: "destructive",
      });
    }
  };

  const mySpaces = spaces.filter(space => space.creatorId === user?.id);
  const joinedSpaces = spaces.filter(space => space.creatorId !== user?.id);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <DashboardHeader user={user} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {user?.username}!</h1>
              <p className="text-muted-foreground">Manage your virtual workspaces</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-card border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Spaces</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{mySpaces.length}</div>
              <p className="text-xs text-muted-foreground">
                Spaces you've created
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Joined Spaces</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{joinedSpaces.length}</div>
              <p className="text-xs text-muted-foreground">
                Collaborative workspaces
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Access</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                {spaces.length}
              </div>
              <p className="text-xs text-muted-foreground">
                All available spaces
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Create Space CTA */}
          <Card className="bg-gradient-hero border-0 shadow-xl text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-xl">Create New Space</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Set up a new virtual office space for your team to collaborate in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowCreateModal(true)}
                size="lg"
                variant="secondary"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Space
              </Button>
            </CardContent>
          </Card>

          {/* Join Space CTA */}
          <Card className="bg-gradient-accent border-0 shadow-xl text-accent-foreground">
            <CardHeader>
              <CardTitle className="text-xl">Join Existing Space</CardTitle>
              <CardDescription className="text-accent-foreground/80">
                Enter a space ID to join an existing virtual office and start collaborating.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowJoinModal(true)}
                size="lg"
                variant="secondary"
                className="gap-2"
              >
                <LogIn className="w-4 h-4" />
                Join Space
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Spaces List */}
        <SpaceList
          spaces={spaces}
          mySpaces={mySpaces}
          joinedSpaces={joinedSpaces}
          isLoading={isLoading}
          onDeleteSpace={handleSpaceDeleted}
        />

        {/* Create Space Modal */}
        <CreateSpaceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSpaceCreated={handleSpaceCreated}
        />

        {/* Join Space Modal */}
        <JoinSpaceModal
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
        />
      </main>
    </div>
  );
}