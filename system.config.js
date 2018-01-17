SystemJS.config({
    baseURL: 'http://localhost:8000/build/src/ts',
    packages: {
        'http://localhost:8000/': {
            defaultExtension: 'js'
        }
    },
    meta: {
        'http://localhost:8000/build/src/cpp/mandelbrot.js': {
            format: 'global'
        }
    },
    map: {
        'three': 'http://localhost:8000/node_modules/three/build/three.min.js'
    }
});
