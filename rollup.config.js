import include from 'rollup-plugin-includepaths';
import commonjs from 'rollup-plugin-commonjs';

export default [
    {
        input: 'build/src/ts/Fractal/Main.js',
        output: {
            name: 'Fractal',
            file: 'build/src/ts/Fractal/Bundle.js',
            format: 'iife'
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
        ]
    },
    {
        input: 'build/src/ts/Sandbox/Main.js',
        output: {
            name: 'Sandbox',
            file: 'build/src/ts/Sandbox/Bundle.js',
            format: 'iife'
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
        ]
    }
]