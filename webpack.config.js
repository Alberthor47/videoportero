const path = require("path");
const dotenv = require('dotenv');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: "./index.js",
    output: {
        filename: "index.js",
        path: path.resolve(__dirname, "./public"),
    },
    devServer: {
        static: {
            directory: path.join(__dirname, './'), 
        },
        compress: true,
        port: 9000,
    },
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    plugins: [
        new webpack.DefinePlugin({
            'process.env': JSON.stringify(dotenv.config().parsed || {})
        }),
        new HtmlWebpackPlugin({
          template: './index.html'
        })
    ],
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env"],
                    },
                },
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
        ],
    },
};
