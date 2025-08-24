import { useState, useEffect, useMemo } from 'react';
import type { UserPosition } from '@/types/space';

interface UseProximityProps {
  userPosition: { x: number; y: number } | null;
  otherUsers: UserPosition[];
  threshold?: number;
}

export function useProximity({ 
  userPosition, 
  otherUsers, 
  threshold = 5 
}: UseProximityProps) {
  const [nearbyUsers, setNearbyUsers] = useState<UserPosition[]>([]);

  const calculateDistance = (pos1: { x: number; y: number }, pos2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
  };

  const proximateUsers = useMemo(() => {
    if (!userPosition) return [];
    
    return otherUsers.filter(user => {
      const distance = calculateDistance(userPosition, { x: user.x, y: user.y });
      return distance <= threshold;
    });
  }, [userPosition, otherUsers, threshold]);

  useEffect(() => {
    setNearbyUsers(proximateUsers);
  }, [proximateUsers]);

  return {
    nearbyUsers,
    hasNearbyUsers: nearbyUsers.length > 0,
    isUserNearby: (userId: string) => nearbyUsers.some(user => user.userId === userId),
  };
}