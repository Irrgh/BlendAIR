import esbuild from "esbuild-wasm";

const init = esbuild.initialize({
    wasmURL: 'https://unpkg.com/esbuild-wasm/esbuild.wasm', // Load the WASM binary
});

const fetchFromServerPlugin = (baseUrl: string) => ({
    name: "fetch-from-server",
    setup(build: any) {

        // Intercept import paths
        build.onResolve({ filter: /.*/ }, (args: any) => {
            console.warn(args.path);

            return { namespace: "http-fetch", path: `${baseUrl}/../${args.path}.ts` };
        });

        // Fetch the file contents
        build.onLoad({ filter: /.*/, namespace: "http-fetch" }, async (args: any) => {
            const response = await fetch(args.path);
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${args.path}`);
            }
            const contents = await response.text();

            return {
                contents,
                loader: "ts", // Assuming TypeScript; adjust if needed
            };
        });

    },
});



/**
 * Bundles typescript / javascript source code in the Browser. 
 * @param filePath absolute path of file to bundle with the project. e.g `/src/util/ArrayStorage.ts`
 * @returns a {@link Promise} resolving to the bundled code.
 */
export async function bundleCode(filePath: string): Promise<string> {

    return init.then(async () => {

        const response: Response = await fetch(filePath);
        const sourceCode = await response.text();

        const result = await esbuild.build({
            stdin: {
                contents: sourceCode,
                resolveDir: './', // Optional, for relative imports
                loader: 'ts', // Parse as TypeScript
            },
            resolveExtensions: ['.ts', '.js'],
            loader: { '.ts': 'ts' },
            bundle: true, // Bundle dependencies
            format: 'esm', // Use ESM format for workers
            target: 'ES2022',
            treeShaking: true,
            platform: 'browser', // Target the browser
            plugins: [fetchFromServerPlugin(filePath)],
            write: false, // Don't write to disk
        });

        // Return the bundled code as a Blob
        return result.outputFiles[0].text;
    });

}
