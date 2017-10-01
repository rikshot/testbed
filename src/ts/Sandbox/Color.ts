// tslint:disable:no-bitwise

export class Color {

    public static Black = new Color(0, 0, 0);
    public static White = new Color(255, 255, 255);

    public static Lerp(color1: Color, color2: Color, value: number) {
        return new Color(
            color1.red() + (color2.red() - color1.red()) * value,
            color1.green() + (color2.green() - color1.green()) * value,
            color1.blue() + (color2.blue() - color1.blue()) * value,
            color1.alpha() + (color2.alpha() - color1.alpha()) * value
        );
    }

    private readonly _red: number;
    private readonly _green: number;
    private readonly _blue: number;
    private readonly _alpha: number;

    private readonly _abgr: number;

    constructor(red: number, green: number, blue: number, alpha?: number) {
        this._red = red & 0xFF;
        this._green = green & 0xFF;
        this._blue = blue & 0xFF;
        this._alpha = alpha ? alpha & 0xFF : 0xFF;

        this._abgr = (this._alpha << 24) ^ (this._blue << 16) ^ (this._green << 8) ^ this._red;
    }

    public red() {
        return this._red;
    }

    public green() {
        return this._green;
    }

    public blue() {
        return this._blue;
    }

    public alpha() {
        return this._alpha;
    }

    public abgr() {
        return this._abgr;
    }

    public css() {
        return 'rgba(' + this._red + ',' + this._green + ',' + this._blue + ',' + this._alpha + ')';
    }

}
