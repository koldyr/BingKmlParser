'use strict';
var GulpConfig = (function () {
    function gulpConfig() {
        this.appBundle = 'BingKmlParser.js';
        this.source = './src/';
        this.sourceApp = this.source + 'app/';

        this.tsOutputPath =  './dist';
        this.allTypeScript = this.sourceApp + '/**/*.ts';

        this.typings = './typings/';
        this.libraryTypeScriptDefinitions = this.typings + '/**/*.ts';
    }
    return gulpConfig;
})();
module.exports = GulpConfig;
