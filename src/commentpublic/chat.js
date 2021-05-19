// establish connection
const socket = io.connect('/');

// query DOM
const message = document.getElementById('message');
const username = document.getElementById('username');
const btn = document.getElementById('send');
const output = document.getElementById('output');
const feedback = document.getElementById('feedback');

// emit events
btn.addEventListener('click', () => {
  socket.emit('chat', {
    message: message.value,
    username: username.value,
    createdAt: new Date(),
    id: new Date().getTime()
  });
  message.value = '';
});

message.addEventListener('keypress', () => {
  socket.emit('typing', username.value);
});

// listen for events
socket.on('chat', (data) => appendMessage(data));

socket.on('typing', (data) => {
  feedback.innerHTML = `<p><em>${data} is typing a message...</em></p>`;
  
  setTimeout(() => feedback.innerHTML = '', 5 * 1000);
});

// load message history
fetch('/comments-history')
.then(async(data) => {
  const messages = await data.json();
  for (const message of messages)
    appendMessage(message);
}) 

function appendMessage(data) {
  output.innerHTML += extremelyLongMessagePreview(data);
}