---
name: music-control
description: Control music playback. Use this tool when the user asks to play, pause, stop, or skip to the next/previous song.
version: 1.0.0
runtime: node
script: index.js
parameters:
  - name: action
    type: string
    required: true
    description: The playback action to perform (play, pause, stop, next, previous).
---

# Music Control Skill

This skill allows controlling the music playback in the application.

## Usage

Invoke this skill when the user wants to control the music playback.

## Examples

- "Next song" (下一首歌)
- "Pause the music" (暂停音乐)
- "Play previous track" (上一首)
