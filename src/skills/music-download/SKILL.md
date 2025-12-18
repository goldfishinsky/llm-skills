---
name: music-download
description: "Search and download music from YouTube using yt-dlp. Use this tool when the user asks to find, get, or download music, songs, or background music (BGM). Supports Chinese and English queries."
version: 1.0.0
runtime: node
script: index.js
parameters:
  - name: query
    type: string
    required: true
    description: "The search query for the music in any language (e.g., '悲伤安静的bgm', 'sad piano music', 'epic orchestral')."
  - name: count
    type: number
    required: false
    description: "Number of tracks to download (default: 1, max: 5)"
    default: 1
dependencies:
  - ytsr
  - glob
---

# Music Download Skill

This skill allows downloading music from YouTube. It uses `yt-dlp` (must be installed on the system) and `ffmpeg` (optional, for MP3 conversion).

## Usage

Provide a search query and optionally a count of tracks to download.
