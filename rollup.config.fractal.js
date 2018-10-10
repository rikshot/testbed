import include from 'rollup-plugin-includepaths';
import commonjs from 'rollup-plugin-commonjs';

export default {
    input: 'build/src/ts/Fractal/Main.js',
    output: {
        name: 'Fractal',
        file: 'build/src/ts/Fractal/Bundle.js',
        format: 'iife',
        interop: false
    },
    plugins: [
        include({
            paths: [
                'build/src/ts'
            ]
        }),
        commonjs({
            sourceMap: false
        })
    ],
    watch: {
        clearScreen: false,
        include: 'build/src/ts/Fractal/**'
    }
}
