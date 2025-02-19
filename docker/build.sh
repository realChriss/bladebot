rm -rf ./dist
npx esbuild "src/**/*.ts" --outdir=dist --platform=node --target=node14 --format=cjs