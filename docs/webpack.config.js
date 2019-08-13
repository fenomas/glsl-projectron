'use strict'

var path = require('path')

var buildPath = path.resolve('.', 'build')


module.exports = (env) => ({

    mode: (() => {
        return (env && env.production) ?
            'production' : 'development'
    })(),

    module: {
        rules: [
            {
                test: /\.(glsl)$/,
                exclude: /node_modules/,
                use: [
                    'raw-loader',
                    'glslify-loader'
                ],
            },
        ],
    },

    entry: {
        maker: './maker.js',
        viewer: './viewer.js',
    },
    output: {
        path: buildPath,
        filename: '[name]-bundle.js',
    },
    devServer: {
        contentBase: buildPath,
        inline: true,
        host: "0.0.0.0",
        stats: "minimal",
    },
})
