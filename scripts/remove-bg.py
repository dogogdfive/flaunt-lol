#!/usr/bin/env python3
"""
Background removal script using rembg.
Reads image from stdin, outputs PNG with transparent background to stdout.

Usage:
    cat image.jpg | python3 remove-bg.py > output.png

Install dependencies:
    pip install rembg pillow
"""

import sys
from rembg import remove

def main():
    # Read image from stdin
    input_data = sys.stdin.buffer.read()

    if not input_data:
        sys.stderr.write("Error: No input data received\n")
        sys.exit(1)

    try:
        # Remove background - returns PNG with transparency
        output_data = remove(input_data)

        # Write to stdout
        sys.stdout.buffer.write(output_data)
    except Exception as e:
        sys.stderr.write(f"Error: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
