import * as express from 'express';
import * as http from 'http';
import * as path from 'path';
import * as WebSocket from 'ws';
import { Player, GameSession, Grid } from './GameSession';

class Game {
    connections: Player[] = [];
    lastID = 0;
    sessions: GameSession[] = [];
    moveTimer: any;
    constructor () {
        const srv = express();
        const server = http.createServer(srv);
        const wss = new WebSocket.Server({ server });

        wss.on('connection', (ws: WebSocket) => {
            console.log(`connected`);

            ws.onmessage = (event: WebSocket.MessageEvent) => {
                console.log(`>> ${event.data}`);
            }

            ws.onclose = (evt) => {
                const index = this.connections.find(p => p.socket === ws);
                // TODO cleanup
            }
            const response = { 
                type: 'init', 
                id: ++this.lastID, 
                msg: 'your round will start soon', 
                status: 'ready' 
            };

            this.connections.push(new Player(response.id, ws));

            // if (this.connections.length % 2 !== 0) {
            if (this.connections.length === 1) {
                response.msg = 'waiting for enemy to connect';
                response.status = 'waiting';
            } else if (this.connections.length === 2) {
                // spawn session
                this.sessions.push(new GameSession(this.connections[0], this.connections[1]));
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

    tick = () => {
        this.sessions.forEach(s => s.tick());
    }

    // onConnect = (client) => {
    //   // spawn session
    // }

    // startTimer = () => this.tick();
}

new Game();