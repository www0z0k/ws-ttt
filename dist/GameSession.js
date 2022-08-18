"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Grid = exports.Player = exports.GameSession = exports.MOVE_STATE = exports.MOVE_RESULT = void 0;
var SYMBOLS;
(function (SYMBOLS) {
    SYMBOLS[SYMBOLS["ZERO"] = 0] = "ZERO";
    SYMBOLS[SYMBOLS["CROSS"] = 1] = "CROSS";
})(SYMBOLS || (SYMBOLS = {}));
;
var CELL_STATES;
(function (CELL_STATES) {
    CELL_STATES[CELL_STATES["ZERO"] = 0] = "ZERO";
    CELL_STATES[CELL_STATES["CROSS"] = 1] = "CROSS";
    CELL_STATES[CELL_STATES["EMPTY"] = 2] = "EMPTY";
})(CELL_STATES || (CELL_STATES = {}));
;
const MOVE_TIMEOUT = 15000;
var MOVE_RESULT;
(function (MOVE_RESULT) {
    MOVE_RESULT[MOVE_RESULT["FAIL"] = 0] = "FAIL";
    MOVE_RESULT[MOVE_RESULT["OK"] = 1] = "OK";
    MOVE_RESULT[MOVE_RESULT["WIN"] = 2] = "WIN";
    MOVE_RESULT[MOVE_RESULT["LOSE"] = 3] = "LOSE";
    MOVE_RESULT[MOVE_RESULT["DRAW"] = 4] = "DRAW";
})(MOVE_RESULT = exports.MOVE_RESULT || (exports.MOVE_RESULT = {}));
;
var MOVE_STATE;
(function (MOVE_STATE) {
    MOVE_STATE[MOVE_STATE["WAIT"] = 0] = "WAIT";
    MOVE_STATE[MOVE_STATE["START"] = 1] = "START";
    MOVE_STATE[MOVE_STATE["DONE"] = 2] = "DONE";
})(MOVE_STATE = exports.MOVE_STATE || (exports.MOVE_STATE = {}));
;
class GameSession {
    constructor(player1, player2) {
        this.tick = () => {
            const ts = Date.now();
        };
        this.player1 = player1;
        this.player2 = player2;
        this.player1.symbol = SYMBOLS.CROSS;
        this.player1.symbol = SYMBOLS.ZERO;
        this.player2.moveState = MOVE_STATE.WAIT;
    }
}
exports.GameSession = GameSession;
class Player {
    constructor(id, ws) {
        this.moveStartTS = -1; // -1 if not his move
        this.gamesPlayed = 0;
        this.winsCount = 0;
        this.lossesCount = 0;
        this.drawsCount = 0;
        this.isPlaying = false;
        this.startMove = () => {
            this.moveState = MOVE_STATE.START;
        };
        this.connectionID = id;
        this.socket = ws;
        // this.socket
    }
}
exports.Player = Player;
class Grid {
    constructor(side) {
        this.getByCoords = (x, y) => this.cells[y][x];
        this.setByCoords = (x, y, value) => {
            if (this.getByCoords(x, y) === CELL_STATES.EMPTY) {
                this.cells[y][x] = value;
                return MOVE_RESULT.OK;
            }
            return MOVE_RESULT.FAIL;
        };
        this.fillLine = () => {
            const result = [];
            for (let i = 0; i < this.side; i++) {
                result.push(CELL_STATES.EMPTY);
            }
            return result;
        };
        this.isWinningSequence = (arr) => arr.every(v => v === CELL_STATES.CROSS) ||
            arr.every(v => v === CELL_STATES.ZERO);
        // init field here
        for (let i = 0; i < side; i++) {
            this.cells.push(this.fillLine());
        }
    }
    makeMove(x, y, symbol) {
        // place
        if (this.setByCoords(x, y, symbol) === MOVE_RESULT.FAIL) {
            return MOVE_RESULT.FAIL;
        }
        return this.validate();
    }
    validate() {
        if (!this.cells.reduce((p, n) => [...p, ...n]).some(v => CELL_STATES.EMPTY)) {
            return MOVE_RESULT.DRAW;
        }
        const diagonal1 = [];
        const diagonal2 = [];
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
}
exports.Grid = Grid;
//# sourceMappingURL=GameSession.js.map