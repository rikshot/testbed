class Color {

    public static Black = new Color(0, 0, 0);

    private _data: Uint8ClampedArray;

    constructor(red: number, green: number, blue: number, alpha?: number) {
        this._data = new Uint8ClampedArray(4);
        this._data[0] = red;
        this._data[1] = green;
        this._data[2] = blue;
        this._data[3] = alpha ? alpha : 255;
    }

    public red() {
        return this._data[0];
    }

    public green() {
        return this._data[1];
    }

    public blue() {
        return this._data[2];
    }

    public alpha() {
        return this._data[3];
    }

    public data() {
        return this._data;
    }

}

class NumberRange {

    public static Scale(input: NumberRange, value: number, output: NumberRange): number {
        return (input.max() * output.min() - input.min() * output.max() + value * output.size()) / input.size();
    }

    private readonly _min: number;
    private readonly _max: number;
    private readonly _size: number;

    constructor(min: number, max: number) {
        this._min = min;
        this._max = max;
        this._size = Math.abs(max - min);
    }

    public min() {
        return this._min;
    }

    public max() {
        return this._max;
    }

    public size() {
        return this._size;
    }

}

((self: Worker) => {
    const log2 = Math.log(2);

    self.onmessage = (event: MessageEvent) => {
        const threadConfig: IThreadConfig = event.data;
        const config = threadConfig.config;

        const stride = threadConfig.width * 4;
        const rows = threadConfig.end - threadConfig.start;
        let data: Uint8ClampedArray;
        if (threadConfig.buffer) {
            data = new Uint8ClampedArray(threadConfig.buffer, threadConfig.start * stride, rows * stride);
        } else {
            data = new Uint8ClampedArray(rows * stride);

        }
        let index = 0;

        const colors: Color[] = [];
        for (let i = 0; i <= config.colors; ++i) {
            const percentage = i / config.colors;
            colors.push(new Color(
                Math.min(255, Math.floor(255 * percentage * config.red)),
                Math.min(255, Math.floor(255 * percentage * config.green)),
                Math.min(255, Math.floor(255 * percentage * config.blue))
            ));
        }

        const widthRange = new NumberRange(0, threadConfig.width);
        const heightRange = new NumberRange(0, threadConfig.height);
        const realRange = new NumberRange(-2.5, 1.0);
        const imaginaryRange = new NumberRange(-1.0, 1.0);

        for (let y = threadConfig.start; y < threadConfig.end; ++y) {
            for (let x = 0; x < threadConfig.width; ++x) {
                const i0 = NumberRange.Scale(widthRange, x, realRange);
                const j0 = NumberRange.Scale(heightRange, y, imaginaryRange);

                const jj0 = j0 * j0;
                let q = (i0 - 0.25);
                q *= q;
                q += jj0;

                if (q * (q + (i0 - 0.25)) < 0.25 * jj0) {
                    data.set(Color.Black.data(), index);
                } else {
                    let iterations = 0;
                    let ii = 0;
                    let jj = 0;
                    for (let i = 0, j = 0; ii + jj <= 4 && iterations <= config.iterations; ii = i * i, jj = j * j, ++iterations) {
                        const itemp = ii - jj + i0;
                        const jtemp = 2 * i * j + j0;
                        if (i === itemp && j === jtemp) {
                            iterations = config.iterations;
                            break;
                        }
                        i = itemp;
                        j = jtemp;
                    }

                    const color = colors[Math.floor((iterations - Math.log(Math.log(ii + jj) / 2) / log2) * config.density) % (colors.length - 1)];
                    if (iterations === config.iterations || !color) {
                        data.set(Color.Black.data(), index);
                    } else {
                        data.set(color.data(), index);
                    }
                }
                index += 4;
            }
        }
        if (threadConfig.buffer) {
            self.postMessage(true);
        } else {
            self.postMessage(data.buffer, [data.buffer]);
        }
    };
})(<Worker> <any> self);
