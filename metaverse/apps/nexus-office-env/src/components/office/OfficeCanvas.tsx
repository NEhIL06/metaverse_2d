import React, { useRef, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Space, UserPosition } from '@/types/space';

interface OfficeCanvasProps {
  space: Space;
  userPosition: { x: number; y: number } | null;
  otherUsers: UserPosition[];
  onMove: (x: number, y: number) => void;
}

// Simple 2D rendering without Canvas API - using DOM elements for better compatibility
export function OfficeCanvas({ space, userPosition, otherUsers, onMove }: OfficeCanvasProps) {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Parse space dimensions
  const [spaceWidth, spaceHeight] = space.dimensions.split('x').map(Number);
  const cellSize = 4; // 4px per unit

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (!userPosition) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert pixel coordinates to grid coordinates
    const gridX = Math.floor(clickX / cellSize);
    const gridY = Math.floor(clickY / cellSize);

    // Ensure movement is within bounds and not too far
    if (gridX >= 0 && gridX < spaceWidth && gridY >= 0 && gridY < spaceHeight) {
      const distance = Math.sqrt(
        Math.pow(gridX - userPosition.x, 2) + Math.pow(gridY - userPosition.y, 2)
      );
      
      // Allow movement only to adjacent cells (distance <= 1.414 for diagonal)
      if (distance <= 1.5) {
        onMove(gridX, gridY);
      }
    }
  };

  const getUserAvatar = (userId: string) => {
    return userId === user?.id ? '🟢' : '🔵';
  };

  return (
    <div className="h-full w-full relative overflow-hidden bg-gradient-subtle">
      <div
        ref={containerRef}
        className="h-full w-full relative cursor-pointer"
        onClick={handleClick}
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: `${cellSize}px ${cellSize}px`,
        }}
      >
        {/* Space boundary */}
        <div  
          className="absolute border-2 border-primary/30 bg-card/20 backdrop-blur-sm"
          style={{
            width: spaceWidth * cellSize,
            height: spaceHeight * cellSize,
            left: Math.max(0, (dimensions.width - spaceWidth * cellSize) / 2),
            top: Math.max(0, (dimensions.height - spaceHeight * cellSize) / 2),
          }}
        >
          {/* Elements */}
          {space.elements?.map((element, index) => (
            <div
              key={`${element.id}-${index}`}
              className="absolute bg-muted border border-border rounded"
              style={{
                left: element.x * cellSize,
                top: element.y * cellSize,
                width: element.element.width * cellSize,
                height: element.element.height * cellSize,
              }}
              title={element.element.name || 'Element'}
            />
          ))}

          {/* Current User */}
          {userPosition && (
            <div
              className="absolute w-6 h-6 rounded-full bg-accent shadow-lg flex items-center justify-center text-xs font-bold text-accent-foreground transition-all duration-200 z-10"
              style={{
                left: userPosition.x * cellSize - 12,
                top: userPosition.y * cellSize - 12,
              }}
              title={`You (${user?.username})`}
            >
              {getUserAvatar(user?.id || '')}
            </div>
          )}

          {/* Other Users */}
          {otherUsers.map((otherUser) => (
            <div
              key={otherUser.userId}
              className="absolute w-6 h-6 rounded-full bg-primary shadow-lg flex items-center justify-center text-xs font-bold text-primary-foreground transition-all duration-200 z-10"
              style={{
                left: otherUser.x * cellSize - 12,
                top: otherUser.y * cellSize - 12,
              }}
              title={otherUser.username || otherUser.userId}
            >
              {getUserAvatar(otherUser.userId)}
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border">
          <p className="text-xs text-muted-foreground">
            Click nearby cells to move • Green dot is you • Blue dots are other users
          </p>
        </div>

        {/* Connection Status */}
        <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-xs font-medium">Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}
