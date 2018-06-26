const path = require('path')
module.exports = {
    mode: 'development',
    devtool: 'inline-source-map',
    stats: {
        errorDetails: true,
    },
    entry: {
        panel: './src/js/extensions/panel.ts',
        config: './src/js/extensions/config.ts',
        viewer: './src/js/extensions/viewer.ts',
        "live-config": './src/js/extensions/live-config.ts',
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
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: [
                    // instead of /\/node_modules\//
                    path.join(process.cwd(), 'node_modules')
                ]
            }
        ]
    },
    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ]
    },
}
