declare interface IPosition {
    x: number;
    y: number;
}

declare interface IRectangle {
    a: IPosition;
    b: IPosition;
}

declare interface IThreadConfig {
    width: number;
    height: number;
    start: number;
    end: number;
    density: number;
    colors: number;
    iterations: number;
    red: number;
    green: number;
    blue: number;
}
