import { Candidates } from 'Sudoku/Candidates';

export class Cell {

    public index: number;
    public row: number;
    public column: number;
    public box: number;

    private _value: number;
    private _frozen: boolean;
    private _candidates: Candidates;

    constructor(index: number) {
        this.index = index;
        this.row = Math.floor(index / 9);
        this.column = index % 9;
        this.box = Math.floor(this.row / 3) * 3 + Math.floor(this.column / 3);
        this._value = 0;
        this._frozen = false;
        this._candidates = new Candidates();
    }

    public set(value: number) {
        if (!this.frozen()) {
            this._value = value;
            this._candidates.unset();
        }
    }

    public value() {
        return this._value;
    }

    public frozen() {
        return this._frozen;
    }

    public freeze() {
        this._frozen = true;
    }

    public candidates() {
        return this._candidates;
    }

}
