'use strict';

const { src, dest, watch, parallel, series } = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const gulpif = require('gulp-if');
const sassGlob = require('gulp-sass-glob');
const autoprefixer = require('gulp-autoprefixer');
const imagemin = require('gulp-imagemin');
const rename = require('gulp-rename');
const nunjucksRender = require('gulp-nunjucks-render');
const del = require('del');
const browserSync = require('browser-sync').create();
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const webpackConfig = require('./webpack.config.js');

/* Environment Variables */
const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

function browsersync() {
	browserSync.init({
		server: {
			baseDir: './build/',
		},
		port: 3000,
		open: true,
		notify: true,
		browser: 'default',
		online: true,
		// logLevel: 'debug',
	});
}
exports.browsersync = browsersync;

function cleanDist() {
	return del('./build/');
}

exports.cleanDist = cleanDist;

function nunjucks() {
	return src('./app/templates/pages/**/*.njk')
		.pipe(nunjucksRender({
			path: ['./app/templates/']
		}))
		.pipe(dest('./build/'))
		.on('end', browserSync.reload);
}

exports.nunjucks = nunjucks;

function styles() {
	return src('./app/styles/main.scss', {
			sourcemaps: isDevelopment ? true : false
		})
		.pipe(sassGlob({
			ignorePaths: ['**/_*.scss'],
		}))
		.pipe(sass({
			outputStyle: 'expanded',
			includePaths: ['./node_modules/', './bower_components/'],
			indentType: 'tab',
			indentWidth: 1,
			linefeed: 'crlf',
		}))
		.pipe(gulpif(!isDevelopment, autoprefixer({
			grid: false,
			cascade: true,
			flexbox: 'no-2009',
		})))
		.pipe(gulpif(!isDevelopment, rename({
			suffix: '.min',
		})))
		.pipe(dest('./build/css', {
			sourcemaps: isDevelopment ? '.' : false,
		}))
		.pipe(browserSync.stream());
}

exports.styles = styles;

function scripts() {
	return src('./app/scripts/main.js')
		.pipe(webpackStream(webpackConfig), webpack)
		.pipe(dest('./build/js/'))
		.on('end', browserSync.reload)
}

exports.scripts = scripts;

function images() {
	return src('./app/images/**/*.*')
		.pipe(gulpif(!isDevelopment, imagemin([
			imagemin.gifsicle({ interlaced: true }),
			imagemin.mozjpeg({ quality: 75, progressive: true }),
			imagemin.optipng({ optimizationLevel: 5 }),
			imagemin.svgo({
				plugins: [{ removeViewBox: true }, { cleanupIDs: false }],
			}),
		])))
		.pipe(dest('./build/img/'));
}

exports.images = images;

function watching() {
	watch('./app/templates/**/*.njk', { usePolling: true }, nunjucks);
	watch('./app/styles/**/*.scss', { usePolling: true }, styles);
	watch('./app/scripts/**/*.js', { usePolling: true }, scripts);
	watch('./app/images/**/*.*', { usePolling: true }, images);
}

exports.watching = watching;

exports.default = series(nunjucks, styles, scripts, images);
exports.development = series(cleanDist, exports.default, parallel(watching, browsersync));
exports.build = series(cleanDist, exports.default);
