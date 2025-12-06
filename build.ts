const { build } = require("esbuild")
const { resolve } = require("path")
const { existsSync } = require("fs")
const { copy } = require("esbuild-plugin-copy")

const isProd = process.argv.indexOf('--mode=production') >= 0;
const dependencies = []

function main() {
    build({
        entryPoints: ['./src/extension.ts'],
        bundle: true,
        outfile: "out/extension.js",
        external: ['vscode', ...dependencies],
        format: 'cjs',
        platform: 'node',
        // logLevel: 'error',
        metafile: true,
        // sourceRoot: __dirname+"/src",
        minify: isProd,
        watch: !isProd,
        sourcemap: !isProd,
        logOverride: {
            'duplicate-object-key': "silent",
            'suspicious-boolean-not': "silent",
        },
        plugins: [
            {
                name: 'build notice',
                setup(build) {
                    build.onStart(() => {
                        console.log('build start')
                    })
                    build.onEnd(() => {
                        console.log('build success')
                    })
                }
            },
        ],
    })
}


(async () => {
    main();
    if (isProd) {
        setTimeout(() => process.exit(0), 100);
    }
})();