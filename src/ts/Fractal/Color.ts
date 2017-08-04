// tslint:disable:no-bitwise

export class Color {

    public static Black = new Color(0, 0, 0);

    public static Lerp(color1: Color, color2: Color, value: number) {
        return new Color(
            color1.red() + (color2.red() - color1.red()) * value,
            color1.green() + (color2.green() - color1.green()) * value,
            color1.blue() + (color2.blue() - color1.blue()) * value,
            color1.alpha() + (color2.alpha() - color1.alpha()) * value
        );
    }

    private readonly _color: number;

    constructor(red: number, green: number, blue: number, alpha?: number) {
        this._color = ((alpha ? alpha : 0xFF) << 24) ^ (blue << 16) ^ (green << 8) ^ red;
    }

    public red() {
        return this._color & 0xFF;
    }

    public green() {
        return (this._color >> 8) & 0xFF;
    }

    public blue() {
        return (this._color >> 16) & 0xFF;
    }

    public alpha() {
        return (this._color >> 24) & 0xFF;
    }

    public value() {
        return this._color;
    }

}
