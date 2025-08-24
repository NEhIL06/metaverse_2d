// src/components/UserList.tsx
import React from 'react';
import { User as UserIcon } from 'lucide-react';

interface User {
  id: string;
  userId: string;
  x: number;
  y: number;
}

interface UserListProps {
  users: User[];
  currentUserId?: string;
}

export function UserList({ users, currentUserId }: UserListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Users ({users.length + 1})</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {/* Current user */}
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
            <UserIcon className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">You</span>
          </div>
          
          {/* Other users */}
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
              <UserIcon className="h-4 w-4 text-gray-600" />
              <span className="text-sm">{user.userId}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}