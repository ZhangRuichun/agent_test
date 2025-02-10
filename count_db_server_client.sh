
#!/bin/bash

echo "Counting lines of code in /db, /server, and /client directories..."
echo "----------------------------------------"

# Function to count lines recursively in a directory
count_dir_lines() {
    dir=$1
    if [ -d "$dir" ]; then
        echo "Directory: $dir"
        find "$dir" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
            -not -path "*/node_modules/*" \
            -not -path "*/dist/*" \
            -not -path "*/.git/*" \
            -exec wc -l {} \; | awk '
            BEGIN { total=0; files=0 }
            { total += $1; files++ }
            END { 
                if (files > 0) {
                    printf "Total: %6d lines in %3d files\n", total, files 
                }
            }'
        echo "----------------------------------------"
    fi
}

# Count lines in each directory
count_dir_lines "./db"
count_dir_lines "./server"
count_dir_lines "./client"
