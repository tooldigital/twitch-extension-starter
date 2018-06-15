const path = require('path')
module.exports = {
    mode: 'development',
    // entry: './src/js/panel.js',
    entry: {
        panel: './src/js/panel.js',
        config: './src/js/config.js',
        viewer: './src/js/viewer.js',
        "live-config": './src/js/live-config.js',
    },
    output: {
        path: path.resolve('public/js'),
        filename: '[name].js',
    },
    module: {
        rules: [
            {
                test: /\.(s*)(c|a)ss$/,
                use: ['style-loader', 'css-loader', 'sass-loader']
            },
        ]
    },
}