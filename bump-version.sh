#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${YELLOW}ℹ${NC} $1"; }

# Check if version argument is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <new-version>"
    echo "Example: $0 0.1.15"
    echo ""
    echo "Or use semantic versioning commands:"
    echo "  $0 patch  - Increment patch version (0.1.14 -> 0.1.15)"
    echo "  $0 minor  - Increment minor version (0.1.14 -> 0.2.0)"
    echo "  $0 major  - Increment major version (0.1.14 -> 1.0.0)"
    exit 1
fi

# Get current version from package.json
CURRENT_VERSION=$(grep '"version"' package.json | head -1 | sed -E 's/.*"version": "([^"]+)".*/\1/')

if [ -z "$CURRENT_VERSION" ]; then
    print_error "Could not find current version in package.json"
    exit 1
fi

print_info "Current version: $CURRENT_VERSION"

# Determine new version based on argument
NEW_VERSION="$1"

if [ "$1" = "patch" ] || [ "$1" = "minor" ] || [ "$1" = "major" ]; then
    # Parse current version
    IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
    
    case "$1" in
        patch)
            NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
            ;;
        minor)
            NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
            ;;
        major)
            NEW_VERSION="$((MAJOR + 1)).0.0"
            ;;
    esac
fi

# Validate version format (basic check)
if ! echo "$NEW_VERSION" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' > /dev/null; then
    print_error "Invalid version format: $NEW_VERSION"
    echo "Version should be in format: X.Y.Z (e.g., 0.1.15)"
    exit 1
fi

print_info "New version: $NEW_VERSION"
echo ""

# Function to update version in a file
update_file() {
    local file=$1
    local pattern=$2
    local replacement=$3
    
    if [ -f "$file" ]; then
        # Create backup
        cp "$file" "$file.bak"
        
        # Perform replacement
        if sed -i.tmp -E "$pattern" "$file"; then
            rm "$file.tmp"
            rm "$file.bak"
            print_success "Updated $file"
            return 0
        else
            mv "$file.bak" "$file"
            print_error "Failed to update $file"
            return 1
        fi
    else
        print_error "File not found: $file"
        return 1
    fi
}

# Track if any updates fail
FAILED=0

# Update package.json
print_info "Updating package.json..."
if ! update_file "package.json" \
    "s/\"version\": \"[^\"]+\"/\"version\": \"$NEW_VERSION\"/" \
    "\"version\": \"$NEW_VERSION\""; then
    FAILED=1
fi

# Update package-lock.json (two places)
print_info "Updating package-lock.json..."
if [ -f "package-lock.json" ]; then
    cp "package-lock.json" "package-lock.json.bak"
    
    # Update root version
    sed -i.tmp -E "0,/\"version\": \"[^\"]+\"/{s/\"version\": \"[^\"]+\"/\"version\": \"$NEW_VERSION\"/}" "package-lock.json"
    
    # Update packages[""].version
    sed -i.tmp -E "/\"packages\": \{/,/^\s*\"\": \{/{ 
        /^\s*\"\": \{/,/^\s*\}/{
            s/\"version\": \"[^\"]+\"/\"version\": \"$NEW_VERSION\"/
        }
    }" "package-lock.json"
    
    rm "package-lock.json.tmp"
    rm "package-lock.json.bak"
    print_success "Updated package-lock.json"
else
    print_info "package-lock.json not found, skipping..."
fi

# Update README.md badges and installation instructions
print_info "Updating README.md..."
if ! update_file "README.md" \
    "s/version-[0-9]+\.[0-9]+\.[0-9]+-/version-$NEW_VERSION-/g" \
    "version-$NEW_VERSION-"; then
    FAILED=1
fi

# Update README.ja.md if it exists
if [ -f "README.ja.md" ]; then
    print_info "Updating README.ja.md..."
    if ! update_file "README.ja.md" \
        "s/version-[0-9]+\.[0-9]+\.[0-9]+-/version-$NEW_VERSION-/g" \
        "version-$NEW_VERSION-"; then
        FAILED=1
    fi
fi

# Update src/index.ts (if version is referenced there)
if [ -f "src/index.ts" ]; then
    print_info "Updating src/index.ts..."
    if grep -q "version.*$CURRENT_VERSION" "src/index.ts"; then
        if ! update_file "src/index.ts" \
            "s/version.*['\"]$CURRENT_VERSION['\"]/version: '$NEW_VERSION'/g" \
            "version: '$NEW_VERSION'"; then
            FAILED=1
        fi
    else
        print_info "No version string found in src/index.ts, skipping..."
    fi
fi

# Update src/index.ts version command
if [ -f "src/index.ts" ]; then
    print_info "Updating src/index.ts version command..."
    if grep -q "\.version('$CURRENT_VERSION')" "src/index.ts"; then
        if ! update_file "src/index.ts" \
            "s/\.version\('$CURRENT_VERSION'\)/\.version('$NEW_VERSION')/g" \
            ".version('$NEW_VERSION')"; then
            FAILED=1
        fi
    fi
fi

# Update deno.json if it exists
if [ -f "deno.json" ]; then
    print_info "Updating deno.json..."
    if ! update_file "deno.json" \
        "s/\"version\": \"[^\"]+\"/\"version\": \"$NEW_VERSION\"/" \
        "\"version\": \"$NEW_VERSION\""; then
        FAILED=1
    fi
fi

echo ""

# Summary
if [ $FAILED -eq 0 ]; then
    print_success "Version bumped successfully from $CURRENT_VERSION to $NEW_VERSION"
    echo ""
    echo "Next steps:"
    echo "  1. Review the changes: git diff"
    echo "  2. Run tests: npm test"
    echo "  3. Build: npm run build"
    echo "  4. Commit: git add -A && git commit -m \"chore: bump version to $NEW_VERSION\""
    echo "  5. Tag: git tag v$NEW_VERSION"
    echo "  6. Push: git push && git push --tags"
    echo "  7. Publish: npm publish"
else
    print_error "Some files failed to update. Please check the errors above."
    exit 1
fi