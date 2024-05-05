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



//{
//    "compilerOptions": {
//        "target": "ESNext",
//        "module": "ESNext",
//        "strict": true,
//        "esModuleInterop": true,
//        "skipLibCheck": true,
//        "forceConsistentCasingInFileNames": true,
//        "outDir": "build",
//        "types": [
//            "@webgpu/types"
//        ],
//        "moduleResolution": "Node"
//    },
//    "include": [
//        "src/**/*.ts"
//    ],
//    "exclude": [
//        "node_modules"
//    ]
//}