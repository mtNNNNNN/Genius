const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = new Map();

function getRoom(code) {
  if (!rooms.has(code)) {
    rooms.set(code, {
      players: new Map(),
      sequence: [],
      inputIndex: 0,
      accepting: false,
      scoreMode: "normal"
    });
  }
  return rooms.get(code);
}

function leaderboard(room) {
  return [...room.players.values()]
    .sort((a,b) => b.score - a.score || b.best - a.best)
    .map((p,i) => ({rank:i+1, id:p.id, name:p.name, score:p.score, best:p.best}));
}

function broadcast(code) {
  const room = getRoom(code);
  io.to(code).emit("leaderboard", leaderboard(room));
}

function newRound(code) {
  const room = getRoom(code);
  const colors = ["red","green","blue","yellow"];
  const next = colors[Math.floor(Math.random()*colors.length)];
  room.sequence.push(next);
  room.inputIndex = 0;
  room.accepting = false;
  io.to(code).emit("showSequence", room.sequence);
}

io.on("connection", socket => {
  socket.on("joinRoom", ({code, name, role}) => {
    code = String(code || "ADM").trim().toUpperCase();
    name = String(name || "Jogador").trim().slice(0,18);

    socket.join(code);
    socket.data.code = code;
    socket.data.role = role;

    const room = getRoom(code);

    if (role === "display") {
      socket.emit("roomJoined", {code, role:"display"});
      broadcast(code);
      return;
    }

    const player = {id:socket.id, name, score:0, best:0};
    room.players.set(socket.id, player);
    socket.emit("roomJoined", {code, role:"player", playerId:socket.id});
    broadcast(code);
  });

  socket.on("startGame", ({code}) => {
    const room = getRoom(code);
    room.sequence = [];
    room.inputIndex = 0;
    room.accepting = false;
    room.players.forEach(p => { p.score = 0; });
    io.to(code).emit("gameReset");
    setTimeout(() => newRound(code), 500);
    broadcast(code);
  });

  socket.on("sequenceShown", ({code}) => {
    const room = getRoom(code);
    room.accepting = true;
    room.inputIndex = 0;
    io.to(code).emit("acceptingInput");
  });

  socket.on("pressColor", ({code, color}) => {
    const room = getRoom(code);
    const player = room.players.get(socket.id);
    if (!player || !room.accepting) return;

    const expected = room.sequence[room.inputIndex];

    if (color === expected) {
      room.inputIndex++;

      if (room.inputIndex >= room.sequence.length) {
        room.accepting = false;
        player.score += 1;
        player.best = Math.max(player.best, room.sequence.length);
        io.to(code).emit("correct", {
          playerId:player.id,
          name:player.name,
          level:room.sequence.length,
          score:player.score
        });
        broadcast(code);
        setTimeout(() => newRound(code), 900);
      } else {
        socket.emit("correctStep");
      }
    } else {
      room.accepting = false;
      player.score = 0;
      io.to(code).emit("wrong", {
        playerId:player.id,
        name:player.name,
        expected,
        pressed:color
      });
      broadcast(code);
      setTimeout(() => {
        room.sequence = [];
        room.inputIndex = 0;
        newRound(code);
      }, 1300);
    }
  });

  socket.on("disconnect", () => {
    const code = socket.data.code;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    room.players.delete(socket.id);
    broadcast(code);
    if (room.players.size === 0) rooms.delete(code);
  });
});

app.get("/health", (_,res) => res.json({ok:true}));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`LogiMemory rodando na porta ${PORT}`));
