import { WebSocketServer } from 'ws';
import { User } from './User';
import { PORT } from './config';

const wss = new WebSocketServer({ port: PORT as number });

wss.on('connection', function connection(ws) {
  console.log("User connected");
  let user = new User(ws);
  ws.on('error', console.error);

  ws.on('close', () => {
    user?.destroy();
  });
});

console.log(`WebSocket server running on port ${PORT}`);