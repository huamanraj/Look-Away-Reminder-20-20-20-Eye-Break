# Look Away Reminder Extension

A Chrome Extension (Manifest V3) that reminds you to look away every 10 minutes for 20 seconds.

## Installation

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select this directory (`Look-Away-Reminder-20-20-20-Eye-Break`).

## Setup

- **Audio**: The extension expects a sound file at `assets/chime.mp3`. A placeholder file has been created. **Please replace `assets/chime.mp3` with a valid MP3 file** for the sound to work correctly.
- **Icons**: Placeholder icons are in `icons/`. Replace them with valid PNGs if desired.

## Features

- **Reminders**: Every 10 minutes (configurable), you will get a notification and a sound.
- **Popup**: Shows the status, time until next reminder, and a countdown ring during breaks.
- **Options**: Customize interval, break duration, sound, and notifications.
- **Test Mode**: Click "Test Reminder" in the popup to simulate a break immediately.

## Design

Built with vanilla HTML, CSS, and JS.

- **Popup**: Clean interface with a gradient background and animated progress ring.
- **Offscreen Document**: a persistent mechanism to play audio even when the popup is closed, fully compatible with Manifest V3.
