---
name: job-search
description: Search for job listings on various platforms (LinkedIn, Indeed, Glassdoor) based on location, time posted, and keywords. Returns structured job data including title, company, location, and link.
version: 1.0.0
runtime: node
script: index.js
parameters:
  - name: city
    type: string
    required: true
    description: City or location to search for jobs (e.g., "Vancouver", "Toronto", "Seattle")
    default: Vancouver
  - name: hours
    type: number
    required: false
    description: Maximum age of job postings in hours (e.g., 24 for jobs posted in last 24 hours)
    default: 24
  - name: platform
    type: string
    required: false
    description: Job platform to search: "linkedin", "indeed", or "glassdoor"
    default: linkedin
  - name: keywords
    type: string
    required: false
    description: Optional job search keywords (e.g., "software engineer", "data analyst")
  - name: limit
    type: number
    required: false
    description: Maximum number of job listings to return (default: 10, max: 50)
    default: 10
dependencies:
  - "@modelcontextprotocol/sdk"
---

# Job Search Skill

This skill uses MCP (Model Context Protocol) to connect to a browser agent (Playwright) and scrape job listings.

## Usage

Provide a city and optional keywords/platform.
