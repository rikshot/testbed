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

((self: Worker) => {
    const log2 = Math.log(2);

    const scale = (range1_min: number, range1_max: number, range2_min: number, range2_max: number, value: number) => {
        const range1_size = Math.abs(range1_max - range1_min);
        const range2_size = Math.abs(range2_max - range2_min);
        return (range1_max * range2_min - range1_min * range2_max) / range1_size + value * (range2_size / range1_size);
    };

    self.onmessage = (event: MessageEvent) => {
        const config: IThreadConfig = event.data;

        const rows = config.end - config.start;
        const data = new Uint8ClampedArray(rows * config.width * 4);
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

        for (let y = config.start; y < config.end; ++y) {
            for (let x = 0; x < config.width; ++x) {
                const i0 = scale(0, config.width, -2.5, 1.0, x);
                const j0 = scale(0, config.height, -1.0, 1.0, y);

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
                        j = 2 * i * j + j0;
                        i = ii - jj + i0;
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
        self.postMessage(data.buffer);
    };
})(<Worker> <any> self);
