const path = require("path");


module.exports = {
    context: __dirname,
    entry: "./src/app/app.ts",
    output: {
        filename: "app.js",
        path: path.resolve(__dirname, "build"),
        publicPath: "/dist/"
    },

    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader"
                }
            }
        ]
    }
    ,

    resolve: {
        extensions: [".ts"]
    }

}
