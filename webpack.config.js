const path = require("path");


module.exports = {
    context: __dirname,
    entry: "./tests/app.ts",
    output: {
        filename: "app.js",
        path: path.resolve(__dirname, "build"),
        publicPath: "/build/"
    },

    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader"
                }
            },
            {
                test: /\.wgsl$/,
                use: {
                    loader: "ts-shader-loader"
                }
            }
        ]
    }
    ,

    resolve: {
        extensions: [".ts"]
    }

}
