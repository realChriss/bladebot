set -e

rm -rf ./dist
npm run build

COMMIT_HASH=$(git rev-parse --short HEAD)
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)

echo "{
  \"commitHash\":\"$COMMIT_HASH\", 
  \"branchName\":\"$BRANCH_NAME\"
}" > dist/build.json