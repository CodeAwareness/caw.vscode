#!/bin/bash

# Check if the version is passed as an argument
if [ -z "$1" ]; then
    echo "Usage: $0 <new_version>"
    exit 1
fi

NEW_VERSION=$1

OS=$(uname)

# Path to your package.json file
PACKAGE_JSON="package.json"

# Update the version in package.json
jq --arg version "$NEW_VERSION" '.version = $version' "$PACKAGE_JSON" > tmp.json && mv tmp.json "$PACKAGE_JSON"

echo "Version updated to $NEW_VERSION in $PACKAGE_JSON"
