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
import { dirname, join, resolve } from "https://deno.land/std@0.224.0/path/mod.ts";
import { existsSync } from "https://deno.land/std@0.224.0/fs/mod.ts";

// Get the real path of the script (follows symlinks)
const scriptPath = new URL(import.meta.url).pathname;
const realScriptPath = await Deno.realPath(scriptPath);
const binDir = dirname(realScriptPath);
const projectRoot = dirname(binDir);
const indexPath = join(projectRoot, 'dist', 'index.js');

// Check if the dist/index.js exists
if (existsSync(indexPath)) {
  await import(`file://${indexPath}`);
} else {
  console.error(`Error: Cannot find module at ${indexPath}`);
  console.error(`This usually happens when jsq-deno is not properly installed.`);
  Deno.exit(1);
}
EOF
chmod +x bin/jsq-deno