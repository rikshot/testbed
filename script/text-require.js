const Module = require('module');
const path = require('path');
const fs = require('fs');

const originalRequire = Module.prototype.require;
const supportedExtensions = ['.html', '.xml'];

Module.prototype.require = function(module) {
    const extension = path.extname(module);
    if(extension.length > 0 && supportedExtensions.includes(extension)) {
        return fs.readFileSync(require.resolve(module), 'utf-8');
    }
    return originalRequire.call(this, module);
};