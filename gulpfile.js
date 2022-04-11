'use strict';

const { src, dest, watch, parallel, series } = require('gulp');
const browserSync = require('browser-sync').create();
const gulpif = require('gulp-if');
const del = require('del');
const rename = require('gulp-rename');
const sass = require('gulp-sass')(require('sass'));
const sassGlob = require('gulp-sass-glob');
const autoprefixer = require('gulp-autoprefixer');
const gcmq = require('gulp-group-css-media-queries');
const cleanCSS = require('gulp-clean-css');
const imagemin = require('gulp-imagemin');
const nunjucksRender = require('gulp-nunjucks-render');
const htmlBeautify = require('gulp-html-beautify');
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

function templates() {
	return src('./app/templates/pages/**/[^_]*.+(njk|html)')
		.pipe(nunjucksRender({
			path: ['./app/templates/'],
			manageEnv: function(environment) {
				environment.addGlobal('IS_PRODUCTION', process.env.NODE_ENV === 'production');
			}
		}))
		.pipe(gulpif(!isDevelopment, htmlBeautify({
			eol: '\r\n',
			indent_with_tabs: true,
			preserve_newlines: false,
			end_with_newline: true,
			unformatted: [],
		})))
		.pipe(dest('./build/'))
		.on('end', browserSync.reload);
}

exports.templates = templates;

function styles() {
	return src('./app/styles/main.scss', {
			sourcemaps: isDevelopment ? true : false
		})
		.pipe(sassGlob({
			ignorePaths: ['**/_*.scss'],
		}))
		.pipe(sass.sync({
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
		.pipe(gulpif(!isDevelopment, gcmq()))
		.pipe(gulpif(!isDevelopment, cleanCSS({
			level: {
				2: {
					mergeAdjacentRules: true,
					mergeIntoShorthands: true,
					mergeMedia: true,
					mergeNonAdjacentRules: true,
					mergeSemantically: false,
					overrideProperties: true,
					removeEmpty: true,
					reduceNonAdjacentRules: true,
					removeDuplicateFontRules: true,
					removeDuplicateMediaBlocks: true,
					removeDuplicateRules: true,
					removeUnusedAtRules: false,
					restructureRules: false,
					skipProperties: [],
				},
			},
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
	return src('./app/images/**/[^_]*.+(png|jp?(e)g|gif|svg|webp)')
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

	const tasks = {
		templates: './app/templates/**/[^_]*.+(njk|html)',
		styles: './app/styles/**/[^_]*.+(scss|css)',
		scripts: './app/scripts/**/[^_]*.js',
		images: './app/images/**/[^_]*.+(png|jp?(e)g|gif|svg|webp)',
	};

	for (const task in tasks) {
		watch(tasks[task], { usePolling: true }, series(task));
	}
}

exports.watching = watching;

exports.default = series(templates, styles, scripts, images);
exports.development = series(cleanDist, exports.default, parallel(watching, browsersync));
exports.build = series(cleanDist, exports.default);
