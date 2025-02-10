#!/bin/bash

# Directories to exclude
EXCLUDES="-not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/.git/*' -not -path '*/migrations/*' -not -path '*/__pycache__/*' -not -path '*/build/*' -not -path '*/.cache/*'"

# Find all files, excluding specified directories
echo "Counting lines of code by file extension..."
echo "----------------------------------------"

# Function to count lines and files for a specific extension
count_lines() {
    ext=$1
    find . -type f -name "*.$ext" $EXCLUDES -exec wc -l {} \; | awk '
    BEGIN { total=0; files=0 }
    { total += $1; files++ }
    END { 
        if (files > 0) {
            printf "%-10s: %6d lines in %3d files\n", "'$ext'", total, files
        }
    }'
}

# Count lines for different file extensions
count_lines "ts"
count_lines "tsx"
count_lines "js"
count_lines "jsx"
count_lines "css"
count_lines "json"
count_lines "md"

# Calculate total
echo "----------------------------------------"
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" -o -name "*.json" -o -name "*.md" \) $EXCLUDES -exec wc -l {} \; | awk '
BEGIN { total=0; files=0 }
{ total += $1; files++ }
END { printf "Total      : %6d lines in %3d files\n", total, files }'