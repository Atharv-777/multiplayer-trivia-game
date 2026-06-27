rm -r build/
npm run build
cd build
zip -r game-build.zip .

# Auto-generate a unique version using timestamp (e.g., 1.0.1719490629)
VERSION="1.0.$(date +%s)"
echo "Uploading version: $VERSION"

curl -X POST https://jest.com/api/management/games/84b3c6cd-006d-4ead-95a8-3764b478bfca/upload-build \
  -H "x-build-version: $VERSION" \
  -H "x-game-upload-token: 9b3989b0-7933-4ab4-8fbc-877c370e5954" \
  -F "file=@game-build.zip" \
  -F "isActive=true" \
  -F "notificationEmail=atharvbidwe11@gmail.com"