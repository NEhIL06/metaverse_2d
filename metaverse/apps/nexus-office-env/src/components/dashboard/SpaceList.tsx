import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Building2, Users, Play, Trash2, Crown, UserCheck } from 'lucide-react';
import type { Space } from '@/types/space';
import { useAuth } from '@/hooks/useAuth';

interface SpaceListProps {
  spaces: Space[];
  mySpaces: Space[];
  joinedSpaces: Space[];
  isLoading: boolean;
  onDeleteSpace: (spaceId: string) => void;
}

export function SpaceList({ spaces, mySpaces, joinedSpaces, isLoading, onDeleteSpace }: SpaceListProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleJoinSpace = (spaceId: string) => {
    navigate(`/office/${spaceId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-48">
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full mb-4" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (spaces.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No spaces yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first virtual office space to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  const SpaceCard = ({ space, isOwner }: { space: Space; isOwner: boolean }) => (
    <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg line-clamp-1">{space.name}</CardTitle>
              <p className="text-sm text-muted-foreground line-clamp-1">{space.id}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={isOwner ? "default" : "secondary"} className="text-xs">
                  {isOwner ? (
                    <>
                      <Crown className="w-3 h-3 mr-1" />
                      Owner
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3 h-3 mr-1" />
                      Member
                    </>
                  )}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {space.dimensions}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Space Preview */}
        <div className="bg-muted rounded-lg h-24 flex items-center justify-center">
          <div className="text-center">
            <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">{space.elements?.length || 0} elements</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => handleJoinSpace(space.id)}
            className="flex-1"
            variant="hero"
          >
            <Play className="w-4 h-4 mr-2" />
            Enter Space
          </Button>
          

          {isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Space</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{space.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDeleteSpace(space.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* My Spaces */}
      {mySpaces.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">My Spaces</h2>
            <Badge variant="secondary">{mySpaces.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mySpaces.map((space) => (
              <SpaceCard key={space.id} space={space} isOwner={true} />
            ))}
          </div>
        </section>
      )}

      {/* Joined Spaces */}
      {joinedSpaces.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-semibold">Joined Spaces</h2>
            <Badge variant="secondary">{joinedSpaces.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {joinedSpaces.map((space) => (
              <SpaceCard key={space.id} space={space} isOwner={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}