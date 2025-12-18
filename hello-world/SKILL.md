---
name: hello-world
description: A simple example skill that greets the user
version: 1.0.0
runtime: shell
script: greet.sh
parameters:
  - name: name
    type: string
    required: true
    description: The name to greet
  - name: language
    type: string
    required: false
    description: Language for greeting (en, zh, es)
    default: en
---

# Hello World Skill

A simple demonstration skill that greets users in multiple languages.

## Usage

Invoke this skill when the user wants a greeting or to test custom skills.

## Examples

- "Say hello to John"
- "Greet me in Chinese"
