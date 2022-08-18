"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");
const GameSession_1 = require("./GameSession");
class Game {
    constructor() {
        this.connections = [];
        this.lastID = 0;
        this.sessions = [];
        this.tick = () => {
            this.sessions.forEach(s => s.tick());
        };
        const srv = express();
        const server = http.createServer(srv);
        const wss = new WebSocket.Server({ server });
        wss.on('connection', (ws) => {
            console.log(`connected`);
            ws.onmessage = (event) => {
                console.log(`>> ${typeof event.data}`);
            };
            ws.onclose = (evt) => {
                const index = this.connections.find(p => p.socket === ws);
                // TODO cleanup
            };
            const response = {
                type: 'init',
                id: ++this.lastID,
                msg: 'your round will start soon',
                status: 'ready'
            };
            this.connections.push(new GameSession_1.Player(response.id, ws));
            // if (this.connections.length % 2 !== 0) {
            if (this.connections.length === 1) {
                response.msg = 'waiting for enemy to connect';
                response.status = 'waiting';
            }
            else if (this.connections.length === 2) {
                // spawn session
                this.sessions.push(new GameSession_1.GameSession(this.connections[0], this.connections[1]));
                setInterval(this.tick, 1000);
            }
            // TODO create waiting pool etc
            ws.send(JSON.stringify(response));
        });
        server.listen(8901, () => {
            console.log(`srv up, hi there ;)`);
        });
        srv.use(express.static(path.join(__dirname, 'client')));
    }
}
new Game();
//# sourceMappingURL=index.js.map