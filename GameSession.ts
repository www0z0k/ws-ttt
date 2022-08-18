import * as WebSocket from 'ws';

enum CELL_STATES { 
    ZERO,
    CROSS,
    EMPTY 
};

const MOVE_TIMEOUT = 15000;
const WIN_SERIES_LENGTH = 3;
const WINS_MAX_LENGTH = 3;

export enum MOVE_RESULT { FAIL, OK, WIN, DRAW };
export enum MOVE_STATE { WAIT, START, DONE };

export class GameSession {
    player1: Player; 
    player2: Player;
    currentPlayer: Player;
    grid = new Grid(3);
    constructor(player1: Player, player2: Player) {
        this.player1 = player1;
        this.player2 = player2;
        this.player1.symbol = CELL_STATES.CROSS;
        this.player1.symbol = CELL_STATES.ZERO;

        this.player1.emptyCellValidator = this.grid.getByCoords;
        this.player2.emptyCellValidator = this.grid.getByCoords;

        this.player2.moveState = MOVE_STATE.WAIT;
        this.currentPlayer = this.player1.startMove();
        
        this.player1.isPlaying = true;
        this.player2.isPlaying = true;
    }

    tick = () => {
        const ts = Date.now();
        if (ts - this.currentPlayer.moveStartTS >= MOVE_TIMEOUT) {
            const winner = this.currentPlayer === this.player1 ? this.player2 : this.player1;
            const loser = this.currentPlayer === this.player1 ? this.player1 : this.player2;
            loser.handleLose();
            winner.handleWin();
            this.restartGameOrHandleSeriesWin();
            return;
        } 
        const newMove = this.currentPlayer.extractResult();
        if (newMove) {
            const res = this.grid.makeMove(newMove.x, newMove.y, this.currentPlayer.symbol);
            const next = this.currentPlayer === this.player1 ? this.player2 : this.player1;
            const curr = this.currentPlayer === this.player1 ? this.player1 : this.player2;
            switch (res) {
                case MOVE_RESULT.OK:
                    curr.moveState = MOVE_STATE.WAIT;
                    this.currentPlayer = next.startMove();
                    return;
                case MOVE_RESULT.DRAW:
                    curr.handleDraw();
                    next.handleDraw();
                    return;
                case MOVE_RESULT.WIN:
                    curr.handleWin();
                    next.handleLose();
                    this.restartGameOrHandleSeriesWin();
                    return;
                case MOVE_RESULT.FAIL:
                    // should never happen...
            }
        }
    }

    restartGameOrHandleSeriesWin = () => {
        if (this.player1.winsSeries >= WIN_SERIES_LENGTH || this.player1.winsCount >= WINS_MAX_LENGTH) {
            this.player1.handleTotalWin();
            this.player2.handleTotalLose();
            return;
        }

        if (this.player2.winsSeries >= WIN_SERIES_LENGTH || this.player2.winsCount >= WINS_MAX_LENGTH) {
            this.player2.handleTotalWin();
            this.player1.handleTotalLose();
            return;
        }

        const next = this.currentPlayer === this.player1 ? this.player2 : this.player1;
        const curr = this.currentPlayer === this.player1 ? this.player1 : this.player2;

        next.symbol = next.symbol === CELL_STATES.CROSS ? CELL_STATES.ZERO : CELL_STATES.CROSS;
        curr.symbol = curr.symbol === CELL_STATES.CROSS ? CELL_STATES.ZERO : CELL_STATES.CROSS;

        this.grid = new Grid(3);
        if (next.symbol === CELL_STATES.CROSS) {
            this.currentPlayer = next.startMove();
            curr.moveState = MOVE_STATE.WAIT;
        } else {
            this.currentPlayer = curr.startMove();
            next.moveState = MOVE_STATE.WAIT;
        }
    }
}

export class Player {
    symbol: CELL_STATES;
    moveState: MOVE_STATE;
    moveStartTS: number = -1; // -1 if not his move
    connectionID: number;
    gamesPlayed = 0;
    winsCount = 0;
    winsSeries = 0;
    lossesCount = 0;
    drawsCount = 0;
    socket: WebSocket;
    isPlaying = false;
    emptyCellValidator: (x: number, y: number) => CELL_STATES;

    pendingResult: { x: number, y: number };

    constructor (id: number, ws: WebSocket) {
        this.connectionID = id;
        this.socket = ws;
        this.socket.onmessage = (event: WebSocket.MessageEvent) => {
            const data = JSON.parse(event.data.toString());
            if (
                data.action === 'move' && 
                this.moveState === MOVE_STATE.START &&
                this.emptyCellValidator(data.x, data.y) === CELL_STATES.EMPTY
            ) {
                this.pendingResult = { x: data.x, y: data.y };
            }
        }
    }

    startMove = (): Player => {
        this.moveState = MOVE_STATE.START;
        this.moveStartTS = Date.now();
        this.socket.send(JSON.stringify({ type: 'moveStart' }));
        return this;
    }

    extractResult = (): { x: number, y: number } => {
        let res = this.pendingResult ? { x: this.pendingResult.x, y: this.pendingResult.y } : null;
        if (this.pendingResult) {
            this.moveState = MOVE_STATE.DONE;
            this.socket.send(JSON.stringify({ type: 'moveEnd' }));
        }
        this.pendingResult = null;
        return res;
    }

    handleTotalWin = () => this.socket.send(JSON.stringify({ type: 'totalwin' }));

    handleTotalLose = () => this.socket.send(JSON.stringify({ type: 'totalloss' }))

    handleWin = () => {
        this.socket.send(JSON.stringify({ type: 'win' }));
        ++this.winsCount;
        ++this.winsSeries;
    }

    handleLose = () => {
        this.socket.send(JSON.stringify({ type: 'lose' }));
        ++this.lossesCount;
        this.winsSeries = 0;
    }
    
    handleDraw = () => {
        this.socket.send(JSON.stringify({ type: 'draw' }));
        ++this.drawsCount;
        this.winsSeries = 0;
    }
}

export class Grid {
    side: number;
    cells: CELL_STATES[][];
    constructor (side: number) {
      // init field here
        for (let i = 0; i < side; i++){
            this.cells.push(this.fillLine());
        }
    }
    makeMove(x: number, y: number, symbol: CELL_STATES): MOVE_RESULT {
        // place
        if (this.setByCoords(x, y, symbol) === MOVE_RESULT.FAIL) {
            return MOVE_RESULT.FAIL;
        }
        return this.validate();
    }

    validate(): MOVE_RESULT {
        if (!this.cells.reduce((p, n) => [...p, ...n]).some(v => CELL_STATES.EMPTY)) {
            return MOVE_RESULT.DRAW;
        }
        const diagonal1: CELL_STATES[] = [];        
        const diagonal2: CELL_STATES[] = [];        
        for (let i = 0; i < this.side; i++) {
            const row = this.cells[i];
            const col = this.cells.map(v => v[i]);

            if (this.isWinningSequence(row) || this.isWinningSequence(col)) {
                return MOVE_RESULT.WIN;
            }

            diagonal1.push(this.cells[i][i]);
            diagonal2.push(this.cells[this.side - 1 - i][this.side - 1 - i]);
        }

        if (this.isWinningSequence(diagonal1) || this.isWinningSequence(diagonal2)) {
            return MOVE_RESULT.WIN;
        }
        return MOVE_RESULT.OK;
    }

    getByCoords = (x: number, y: number): CELL_STATES => this.cells[y][x];

    setByCoords = (x: number, y: number, value: CELL_STATES): MOVE_RESULT => {
        if (this.getByCoords(x, y) === CELL_STATES.EMPTY) {
            this.cells[y][x] = value;
            return MOVE_RESULT.OK;
        }
        return MOVE_RESULT.FAIL;
    }

    fillLine = (): CELL_STATES[] => {
        const result: CELL_STATES[] = [];
        for (let i = 0; i < this.side; i++) {
            result.push(CELL_STATES.EMPTY);
        }
        return result;
    }

    isWinningSequence = (arr: CELL_STATES[]): boolean => 
        arr.every(v => v === CELL_STATES.CROSS) || 
        arr.every(v => v === CELL_STATES.ZERO);
}