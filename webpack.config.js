const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");


module.exports = {
    mode: "production",
    context: __dirname,
    entry: "./src/app.ts",
    output: {
        filename: "app.js",
        path: path.resolve(__dirname, "build"),
        publicPath: "/build/"
    },
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin({
            terserOptions: {
                keep_classnames: true, // Preserve class names
                keep_fnames: true, // Preserve function names
                mangle: false,
                output: {
                    comments: false, // Remove comments from the output
                    beautify: true, // Ensure the output is readable
                },
            },
        })]
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
