#!/bin/bash

# Check if the version is passed as an argument
if [ -z "$1" ]; then
    echo "Usage: $0 <new_version>"
    exit 1
fi

OS=$(uname)
NEW_VERSION=$1
./update-version.sh ${NEW_VERSION}

yarn package

echo "!!! Make sure you have also updated the CHANGELOG and README files."