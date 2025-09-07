#!/bin/bash

# Clean and recreate bin files to avoid any strange characters
cat > bin/jsq << 'EOF'
#!/usr/bin/env node
import '../dist/index.js';
EOF
chmod +x bin/jsq

cat > bin/jsq-bun << 'EOF'
#!/usr/bin/env bun
import '../dist/index.js';
EOF
chmod +x bin/jsq-bun

cat > bin/jsq-deno << 'EOF'
#!/usr/bin/env -S deno run --allow-env --allow-read --allow-run --allow-sys --allow-net
import '../dist/index.js';
EOF
chmod +x bin/jsq-deno