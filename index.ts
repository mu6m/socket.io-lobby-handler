import express from "express";
import http from "http";
import { v4 as uuidv4 } from "uuid";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: "*",
	},
});

function usersinroom(roomID: string) {
	let clients = io.sockets.adapter.rooms.get(roomID);
	return clients ? clients.size : 0;
}
const users_per_room = 2;
io.on("connection", (socket) => {
	socket.on("join", async () => {
		socket.join("wait");
		if (usersinroom("wait") % users_per_room == 0) {
			console.log("created room");
			let room_socket = Array.from(io.sockets.adapter.rooms.get("wait") || []);
			console.log(room_socket);
			const room_id = uuidv4();
			let sock_list = [];
			for (let index = 0; index < users_per_room; index++) {
				const sock = io.sockets.sockets.get(room_socket[index]);
				sock_list.push(room_socket[index]);
				sock.join(room_id);
			}
			io.to(room_id).emit("room", { room_id, users: sock_list });
		}
	});
	socket.on("update", ({ room_id, id, msg }) => {
		socket.to(room_id).emit("update", { msg, id });
	});

	socket.on("disconnecting", (reason) => {
		for (const room of socket.rooms) {
			if (room !== socket.id) {
				socket.to(room).emit("room_closed", socket.id);
				io.in(room).socketsLeave(room);
				console.log("closed room");
			}
		}
	});
});

server.listen(3000, () => {
	console.log("listening on *:3000");
});
