SystemJS.config({
    baseURL: 'http://localhost:8000/build/src/ts',
    packages: {
        'http://localhost:8000/': {
            defaultExtension: 'js'
        }
    }
});
