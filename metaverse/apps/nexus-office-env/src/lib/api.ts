import axios from 'axios';
import type { 
  SignUpRequest, 
  SignInRequest, 
  AuthResponse, 
  Avatar
} from '@/types/auth';
import type {
  Space, 
  CreateSpaceRequest,
  MapTemplate,
  Element 
} from '@/types/space';

const API_BASE = 'http://localhost:3000/api/v1';

// Create axios instance with interceptors
const api = axios.create({
  baseURL: API_BASE,
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signUp: async (data: SignUpRequest): Promise<AuthResponse> => {
    const response = await api.post('/signup', data);
    return response.data;
  },

  signIn: async (data: SignInRequest): Promise<AuthResponse> => {
    const response = await api.post('/signin', data);
    return response.data;
  },
};

// Avatar API
export const avatarAPI = {
  getAll: async (): Promise<{ avatars: Avatar[] }> => {
    const response = await api.get('/avatars');
    return response.data;
  },

  updateUserAvatar: async (avatarId: string): Promise<void> => {
    await api.post('/user/metadata', { avatarId });
  },

  getUsersMetadata: async (userIds: string[]): Promise<{ avatars: Array<{userId: string, avatarId?: string}> }> => {
    const response = await api.get(`/user/metadata/bulk?ids=[${userIds.join(',')}]`);
    return response.data;
  },
};

// Space API
export const spaceAPI = {
  getAll: async (): Promise<{ spaces: Space[] }> => {
    const response = await api.get('/space/all');
    return response.data;
  },

  getById: async (spaceId: string): Promise<Space> => {
    const response = await api.get(`/space/${spaceId}`);
    return response.data;
  },

  create: async (data: CreateSpaceRequest): Promise<{ spaceId: string }> => {
    const response = await api.post('/space', data);
    return response.data;
  },

  delete: async (spaceId: string): Promise<void> => {
    await api.delete(`/space/${spaceId}`);
  },

  addElement: async (spaceId: string, elementId: string, x: number, y: number): Promise<void> => {
    await api.post('/space/element', { spaceId, elementId, x, y });
  },

  removeElement: async (spaceId: string, elementId: string): Promise<void> => {
    await api.delete('/space/element', { data: { spaceId, elementId } });
  },
};

// Mock data for map templates and elements (since they're admin-only in backend)
export const mockMapTemplates: MapTemplate[] = [
  {
    id: 'conf-room',
    name: 'Conference Room',
    dimensions: '100x200',
    thumbnail: '/api/placeholder/400/300',
    defaultElements: [],
  },
  {
    id: 'open-office',
    name: 'Open Office',
    dimensions: '200x200',
    thumbnail: '/api/placeholder/400/300',
    defaultElements: [],
  },
  {
    id: 'casual-lounge',
    name: 'Casual Lounge',
    dimensions: '150x150',
    thumbnail: '/api/placeholder/400/300',
    defaultElements: [],
  },
  {
    id: 'team-room',
    name: 'Small Team Room',
    dimensions: '100x100',
    thumbnail: '/api/placeholder/400/300',
    defaultElements: [],
  },
];

export const mockElements: Element[] = [
  { id: '1', imageUrl: '/api/placeholder/50/50', width: 1, height: 1, static: true, name: 'Desk' },
  { id: '2', imageUrl: '/api/placeholder/50/50', width: 1, height: 1, static: true, name: 'Chair' },
  { id: '3', imageUrl: '/api/placeholder/50/50', width: 1, height: 1, static: true, name: 'Table' },
  { id: '4', imageUrl: '/api/placeholder/50/50', width: 1, height: 1, static: false, name: 'Plant' },
  { id: '5', imageUrl: '/api/placeholder/50/50', width: 2, height: 1, static: true, name: 'Sofa' },
  { id: '6', imageUrl: '/api/placeholder/50/50', width: 1, height: 1, static: true, name: 'Coffee Machine' },
];

export default api;