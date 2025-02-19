rm -rf ./dist
npx esbuild "src/**/*" --outdir=dist --platform=node --target=node14 --format=cjs