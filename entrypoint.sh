#!/bin/sh

# Check if Xvfb is already running
if ! pgrep -x "Xvfb" > /dev/null
then
    echo "Starting Xvfb..."
    Xvfb :10 -screen 0 1920x1080x8 -ac &
else
    echo "Xvfb is already running."
fi

# Set the DISPLAY environment variable
export DISPLAY=:10

# Run the npm start command
env npm run start
