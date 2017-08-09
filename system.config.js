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
    }
});
