const messages = document.getElementById('messages');
const usersList = document.getElementById('users');
const status = document.getElementById('status');
const joinDialog = document.getElementById('join-dialog');
const joinForm = document.getElementById('join-form');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const recipient = document.getElementById('recipient');
const sendButton = messageForm.querySelector('button');
let myName = '';

const socket = new WebSocket(`ws://${location.host}`);

function addSystemMessage(text) {
  const item = document.createElement('div');
  item.className = 'system';
  item.textContent = text;
  messages.append(item);
  messages.scrollTop = messages.scrollHeight;
}

function addMessage(data) {
  const item = document.createElement('div');
  item.className = `message${data.private ? ' private' : ''}`;
  const author = document.createElement('strong');
  author.textContent = `${data.name}${data.private ? ' (лично)' : ''}:`;
  author.style.color = data.color;
  const content = document.createElement('span');
  content.textContent = data.text;
  item.append(author, content);
  messages.append(item);
  messages.scrollTop = messages.scrollHeight;
}

function showUsers(users) {
  usersList.replaceChildren();
  recipient.innerHTML = '<option value="">Всем</option>';

  users.forEach((user) => {
    const item = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = user.color;
    item.append(dot, document.createTextNode(user.name));
    usersList.append(item);

    if (user.name !== myName) {
      const option = document.createElement('option');
      option.value = user.name;
      option.textContent = user.name;
      recipient.append(option);
    }
  });
}

socket.addEventListener('open', () => {
  status.textContent = 'Подключено';
});

socket.addEventListener('close', () => {
  status.textContent = 'Соединение закрыто';
  messageInput.disabled = true;
  recipient.disabled = true;
  sendButton.disabled = true;
});

socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'system') addSystemMessage(data.text);
  if (data.type === 'message') addMessage(data);
  if (data.type === 'users') showUsers(data.users);
});

joinForm.addEventListener('submit', (event) => {
  event.preventDefault();
  myName = document.getElementById('name-input').value.trim();
  const color = document.getElementById('color-input').value;
  if (!myName || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ type: 'join', name: myName, color }));
  joinDialog.close();
  messageInput.disabled = false;
  recipient.disabled = false;
  sendButton.disabled = false;
  messageInput.focus();
});

messageForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  socket.send(JSON.stringify({ type: 'message', text, to: recipient.value }));
  messageInput.value = '';
  messageInput.focus();
});
