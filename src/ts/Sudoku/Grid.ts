import { Cell } from 'Sudoku/Cell.js';

export class Grid {

    private _cells: Cell[] = [];

    private _rows: Cell[][] = [];
    private _columns: Cell[][] = [];
    private _boxes: Cell[][] = [];

    private _peers: Cell[][] = [];

    constructor(sudoku?: string) {
        for (let i = 0; i < 81; ++i) {
            this._cells[i] = new Cell(i);
        }
        for (let row = 0; row < 9; ++row) {
            this._rows[row] = this._cells.filter((cell) => cell.row === row);
        }
        for (let column = 0; column < 9; ++column) {
            this._columns[column] = this._cells.filter((cell) => cell.column === column);
        }
        for (let box = 0; box < 9; ++box) {
            this._boxes[box] = this._cells.filter((cell) => cell.box === box);
        }
        for (const cell of this._cells) {
            this._peers[cell.index] = this._cells.filter((peer) => {
                return cell.index !== peer.index &&
                    (cell.row === peer.row ||
                    cell.column === peer.column ||
                    (cell.row !== peer.row && cell.column !== peer.column && cell.box === peer.box));
            });
        }
        if (typeof sudoku !== 'undefined') {
            if (sudoku.length !== 81) {
                throw new Error('Input is not 81 characters.');
            }
            for (const cell of this._cells) {
                cell.set(parseInt(sudoku[cell.index], 10));
                if (cell.value()) {
                    cell.freeze();
                }
                if (!this.update_candidates(cell.index)) {
                    throw new Error('Input is not valid');
                }
            }
            if (!this.valid()) {
                throw new Error('Input is not valid');
            }
        }
    }

    public cells() {
        return this._cells;
    }

    public row(row: number) {
        return this._rows[row];
    }

    public column(column: number) {
        return this._columns[column];
    }

    public box(box: number) {
        return this._boxes[box];
    }

    public peers(index: number) {
        return this._peers[index];
    }

    public valid() {
        return !this._cells.some((cell) => {
            const peers = this._peers[cell.index];
            return !!cell.value() && peers.some((peer) => {
                return !!peer.value() && peer.value() === cell.value();
            });
        });
    }

    public complete() {
        return this._cells.every((cell) => !!cell.value());
    }

    public pretty() {
        let output  = '';
        for (let row = 0; row < 9; ++row) {
            if (!(row % 3)) {
                output += '+-------+-------+-------+\n';
            }
            for (let column = 0; column < 9; ++column) {
                output += (!(column % 9) ? '| ' : !(column % 3) ? ' | ' : ' ');
                output += this._cells[row * 9 + column].value();
            }
            output += ' |\n';
        }
        output += '+-------+-------+-------+';
        return output;
    }

    public update_candidates(index: number) {
        const cell = this._cells[index];
        if (!cell.value()) {
            cell.candidates().set();
            for (const peer of this._peers[index]) {
                if (peer.value()) {
                    cell.candidates().unset(peer.value());
                    if (cell.candidates().none()) {
                        return false;
                    }
                }
            }
        } else {
            for (const peer of this._peers[index]) {
                if (!peer.value()) {
                    peer.candidates().unset(cell.value()) ;
                    if (peer.candidates().none()) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

}
