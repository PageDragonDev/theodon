var webpack = require('webpack');
var path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

var BUILD_DIR = path.resolve(__dirname, './dist');
var APP_DIR = path.resolve(__dirname, '.');
var fileName = "index.js";

var config = {
    entry: ['babel-polyfill',APP_DIR + '/src/index.js'],
    output: {
        path: BUILD_DIR,
        filename: fileName,
        library: 'theodon',
        libraryTarget: 'umd'
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "babel-loader",
                query: {
                    presets: ["env"]
                }
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'Theodin Test Portal',
            template: './test.html'
        })
    ],
    node: {
       fs: "empty"
    }
};

module.exports = config;
