#!/bin/bash

# Build jsq browser bundle first
echo "Building jsq browser bundle..."
cd ../examples/web-ui
npm install
npm run build

# Copy the built jsq bundle to docs site
echo "Copying jsq browser bundle to docs site..."
mkdir -p ../docs-site/public
cp dist/jsq-browser.js ../docs-site/public/
cp dist/jsq-browser.js.map ../docs-site/public/ 2>/dev/null || true

# Build the documentation site
echo "Building Angular documentation site..."
cd ../../docs-site
npm install
npm run build

echo "Documentation build complete!"