'use strict';

const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();

const jasmine = require('gulp-jasmine');
const reporters = require('jasmine-reporters');
const open = require('gulp-open');

const Config = require('./gulpfile.config');
const config = new Config();

/**
 * Remove all generated JavaScript files from TypeScript compilation.
 */
gulp.task('clean', function (cb) {
    const typeScriptGenFiles = [
        config.tsOutputPath + '/**/*.js',
        config.tsOutputPath + '/**/*.js.map',
        config.tsOutputPath + '/**/*.html',
        '!' + config.tsOutputPath + '/lib'
    ];

    const del = require('del');
    // delete the files
    del(typeScriptGenFiles, cb);
});

/**
 * Lint all custom TypeScript files.
 */
gulp.task('ts-lint', function () {
    return gulp.src(config.allTypeScript).pipe(plugins.tslint({
        formatter: 'prose'
    }));
});

gulp.task('copy-html', function () {
    const paths = {
        pages: ['src/*.html']
    };
    return gulp.src(paths.pages)
        .pipe(gulp.dest(config.tsOutputPath));
});

/**
 * Compile TypeScript and include references to library and app .d.ts files.
 */
gulp.task('compile', function () {
    gulp
        .src([
            config.allTypeScript,
            config.libraryTypeScriptDefinitions,
        ])
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.typescript({
                target: 'ES5',
                module: "commonjs",
                moduleResolution: "node",
                declarationFiles: false,
                noResolve: true,
                noEmitOnError: true,
                experimentalDecorators: true
            },
            plugins.typescript.reporter.fullReporter(true))).js
        .pipe(plugins.concat(config.appBundle))
        .pipe(plugins.sourcemaps.write({sourceRoot: config.tsOutputPath}))
        .pipe(gulp.dest(config.tsOutputPath));
});

gulp.task('watch', function () {
    gulp.watch([config.allTypeScript], ['ts-lint', 'compile']);
});

gulp.task('build', (callback) => {
    require('run-sequence')('clean', 'ts-lint', 'copy-html', 'compile', callback);
});

gulp.task('test', ['build'], function(){
    gulp.src('./spec/SpecRunner.html')
        .pipe(open());
});

