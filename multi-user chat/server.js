const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const users = new Map();

app.use(express.static(path.join(__dirname, 'public')));

function send(socket, data) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

function broadcast(data, except) {
  wss.clients.forEach((client) => {
    if (client !== except) send(client, data);
  });
}

function userList() {
  return [...users.values()].map(({ name, color }) => ({ name, color }));
}

function updateUsers() {
  broadcast({ type: 'users', users: userList() });
}

wss.on('connection', (socket) => {
  socket.on('message', (raw) => {
    let data;

    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (data.type === 'join') {
      const name = String(data.name || '').trim().slice(0, 20);
      const color = /^#[0-9A-F]{6}$/i.test(data.color) ? data.color : '#2563eb';

      if (!name || users.has(socket)) return;

      const presentUsers = userList();
      users.set(socket, { name, color });
      const welcome = presentUsers.length
        ? `Добро пожаловать. В чате уже присутствуют: ${presentUsers.map((user) => user.name).join(', ')}.`
        : 'Добро пожаловать. Вы первый в чате.';

      send(socket, { type: 'system', text: welcome });
      broadcast({ type: 'system', text: `К нам присоединился ${name}.` }, socket);
      updateUsers();
      return;
    }

    const user = users.get(socket);
    if (!user || data.type !== 'message') return;

    const text = String(data.text || '').trim().slice(0, 500);
    if (!text) return;

    const message = {
      type: 'message',
      name: user.name,
      color: user.color,
      text,
      private: Boolean(data.to)
    };

    if (data.to) {
      const recipient = [...users.entries()].find(([, value]) => value.name === data.to)?.[0];
      if (!recipient || recipient === socket) return;
      send(recipient, message);
      send(socket, message);
      return;
    }

    broadcast(message);
  });

  socket.on('close', () => {
    const user = users.get(socket);
    if (!user) return;

    users.delete(socket);
    broadcast({ type: 'system', text: `${user.name} нас покинул.` });
    updateUsers();
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Сервер запущен: http://localhost:${port}`));
