'use strict';

const webpack = require('webpack');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

/* Environment Variables */
const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

module.exports = {
	mode: isDevelopment ? 'development' : 'production',
	entry: {
		main: path.resolve(__dirname, 'app', 'scripts', 'main.js'),
	},
	output: {
		path: path.resolve(__dirname, 'build', 'js'),
		filename: isDevelopment ? '[name].js' : 'min.[name].js',
	},
	devtool: isDevelopment ? 'cheap-module-source-map' : false,
	stats: isDevelopment ? 'errors-only' : 'normal',
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /(node_modules|bower_components)/,
				use: {
					loader: 'babel-loader',
				},
			},
		],
	},
	optimization: {
		minimize: isDevelopment ? false : true,
		minimizer: [
			new TerserPlugin()
		],
	},
};
