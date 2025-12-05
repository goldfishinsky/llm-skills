import { Tool } from '../types';
import { MCPClient } from '../mcpClient';

// Platform-specific job search configurations
const PLATFORM_CONFIGS = {
  linkedin: {
    name: 'LinkedIn',
    baseUrl: 'https://www.linkedin.com/jobs/search',
    buildUrl: (city: string, hours: number, keywords?: string) => {
      const params = new URLSearchParams({
        location: city,
        f_TPR: `r${hours * 3600}`, // Time posted in seconds
        position: '1',
        pageNum: '0'
      });
      if (keywords) {
        params.set('keywords', keywords);
      }
      return `https://www.linkedin.com/jobs/search?${params.toString()}`;
    },
    selectors: {
      jobCard: '.job-search-card',
      title: '.job-search-card__title',
      company: '.job-search-card__company-name',
      location: '.job-search-card__location',
      link: 'a.job-search-card__link-wrapper',
      date: '.job-search-card__listdate'
    }
  },
  indeed: {
    name: 'Indeed',
    baseUrl: 'https://www.indeed.com/jobs',
    buildUrl: (city: string, hours: number, keywords?: string) => {
      const params = new URLSearchParams({
        l: city,
        fromage: Math.ceil(hours / 24).toString(), // Days
      });
      if (keywords) {
        params.set('q', keywords);
      }
      return `https://www.indeed.com/jobs?${params.toString()}`;
    },
    selectors: {
      jobCard: '.job_seen_beacon',
      title: 'h2.jobTitle span[title]',
      company: '[data-testid="company-name"]',
      location: '[data-testid="text-location"]',
      link: 'h2.jobTitle a',
      date: '[data-testid="myJobsStateDate"]'
    }
  },
  glassdoor: {
    name: 'Glassdoor',
    baseUrl: 'https://www.glassdoor.com/Job/jobs.htm',
    buildUrl: (_city: string, hours: number, keywords?: string) => {
      const params = new URLSearchParams({
        'sc.keyword': keywords || '',
        'locT': 'C',
        'locId': '3991', // Vancouver ID, should be dynamic
        'fromAge': Math.ceil(hours / 24).toString()
      });
      return `https://www.glassdoor.com/Job/jobs.htm?${params.toString()}`;
    },
    selectors: {
      jobCard: 'li[data-test="jobListing"]',
      title: '[data-test="job-title"]',
      company: '[data-test="employer-name"]',
      location: '[data-test="emp-location"]',
      link: 'a[data-test="job-link"]',
      date: '[data-test="job-age"]'
    }
  }
};

export const jobSearchTool: Tool = {
  id: 'job_search',
  name: 'search_jobs',
  description: 'Search for job listings on various platforms (LinkedIn, Indeed, Glassdoor) based on location, time posted, and keywords. Returns structured job data including title, company, location, and link.',
  parameters: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'City or location to search for jobs (e.g., "Vancouver", "Toronto", "Seattle")',
        default: 'Vancouver'
      },
      hours: {
        type: 'number',
        description: 'Maximum age of job postings in hours (e.g., 24 for jobs posted in last 24 hours)',
        default: 24
      },
      platform: {
        type: 'string',
        description: 'Job platform to search: "linkedin", "indeed", or "glassdoor"',
        default: 'linkedin'
      },
      keywords: {
        type: 'string',
        description: 'Optional job search keywords (e.g., "software engineer", "data analyst")'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of job listings to return (default: 10, max: 50)',
        default: 10
      },
      headless: {
        type: 'boolean',
        description: 'Run browser in headless mode (true) or show browser window (false). Default: false (visible browser)',
        default: false
      }
    },
    required: ['city']
  },
  execute: async (
    { city = 'Vancouver', hours = 24, platform = 'linkedin', keywords, limit = 10, headless = false }: {
      city?: string;
      hours?: number;
      platform?: string;
      keywords?: string;
      limit?: number;
      headless?: boolean;
    },
    onProgress?: (message: string) => void
  ) => {
    try {
      const resultLimit = Math.min(Math.max(1, limit), 50);
      
      const progress = (msg: string) => {
        console.log(msg);
        if (onProgress) onProgress(msg);
      };

      // Validate platform
      const platformKey = platform.toLowerCase() as keyof typeof PLATFORM_CONFIGS;
      if (!PLATFORM_CONFIGS[platformKey]) {
        return `Error: Unsupported platform "${platform}". Supported platforms: linkedin, indeed, glassdoor`;
      }

      const config = PLATFORM_CONFIGS[platformKey];
      progress(`🔍 Searching ${config.name} for jobs in ${city} (posted within ${hours}h)...`);
      progress(`🖥️  Browser mode: ${headless ? 'headless' : 'visible window (headed)'}`);

      // Initialize MCP client for Playwright
      // Note: Playwright MCP is headed (visible) by default
      const mcpArgs = ['@playwright/mcp@latest'];
      
      // Explicitly ensure headed mode for visibility
      if (headless) {
        mcpArgs.push('--headless');
        progress('Running in headless mode');
      } else {
        // Force headed mode explicitly
        progress('Running in HEADED mode (browser window should be visible)');
        progress(`Command: npx ${mcpArgs.join(' ')}`);
      }
      
      const mcpClient = new MCPClient({
        command: 'npx',
        args: mcpArgs
      });

      try {
        // Connect to MCP server
        progress('🎭 Connecting to Playwright MCP server...');
        await mcpClient.connect();
        progress('✓ Connected to Playwright');

        // List available tools for debugging
        try {
          const tools = await mcpClient.listTools();
          progress(`📋 Available MCP tools: ${tools.map((t: any) => t.name).join(', ')}`);
        } catch (e) {
          progress('⚠️ Could not list tools');
        }

        // Build search URL
        const searchUrl = config.buildUrl(city, hours, keywords);
        progress(`📍 Navigating to: ${searchUrl}`);

        // Navigate to the search page
        await mcpClient.callTool('playwright_navigate', {
          url: searchUrl
        });

        // Wait longer for page to load (especially for visible browser)
        const waitTime = headless ? 3000 : 5000;
        progress(`⏳ Waiting ${waitTime}ms for page to load...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));

        // Debug: Get page info
        progress('🔍 Inspecting page content...');
        try {
          const pageInfo = await mcpClient.callTool('playwright_execute', {
            script: `
              return JSON.stringify({
                title: document.title,
                url: window.location.href,
                bodyText: document.body?.innerText?.substring(0, 500) || 'No body text',
                jobCardCount: document.querySelectorAll('${config.selectors.jobCard}').length,
                allJobElements: Array.from(document.querySelectorAll('[class*="job"]')).slice(0, 5).map(el => ({
                  tag: el.tagName,
                  classes: el.className,
                  text: el.innerText?.substring(0, 100)
                }))
              });
            `
          });
          
          // Extract JSON from markdown response
          let jsonText = pageInfo.content?.[0]?.text || '{}';
          const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/) || 
                           jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonText = jsonMatch[1] || jsonMatch[0];
          }
          
          const info = JSON.parse(jsonText.trim());
          progress(`📄 Page Title: ${info.title}`);
          progress(`🔗 Page URL: ${info.url}`);
          progress(`🔢 Job cards found with selector '${config.selectors.jobCard}': ${info.jobCardCount}`);
          
          if (info.jobCardCount === 0) {
            progress('⚠️ No job cards found with current selector. Showing elements with "job" in class name:');
            info.allJobElements?.forEach((el: any, i: number) => {
              progress(`  ${i + 1}. <${el.tag}> class="${el.classes.substring(0, 100)}"`);
            });
          }
        } catch (e) {
          console.error('Debug info error:', e);
          progress('⚠️ Debug info failed (continuing anyway)');
        }

        // Extract job listings using JavaScript
        const extractScript = `
          const jobs = [];
          const cards = document.querySelectorAll('${config.selectors.jobCard}');
          const limit = ${resultLimit};
          
          for (let i = 0; i < Math.min(cards.length, limit); i++) {
            const card = cards[i];
            try {
              const titleEl = card.querySelector('${config.selectors.title}');
              const companyEl = card.querySelector('${config.selectors.company}');
              const locationEl = card.querySelector('${config.selectors.location}');
              const linkEl = card.querySelector('${config.selectors.link}');
              const dateEl = card.querySelector('${config.selectors.date}');
              
              if (titleEl && companyEl) {
                jobs.push({
                  title: titleEl.textContent?.trim() || '',
                  company: companyEl.textContent?.trim() || '',
                  location: locationEl?.textContent?.trim() || '',
                  link: linkEl?.href || '',
                  postedDate: dateEl?.textContent?.trim() || ''
                });
              }
            } catch (e) {
              console.error('Error extracting job:', e);
            }
          }
          
          return JSON.stringify(jobs);
        `;

        progress('📊 Extracting job listings...');
        const result = await mcpClient.callTool('playwright_execute', {
          script: extractScript
        });

        // Parse the results - MCP returns Markdown format, need to extract JSON
        let jobs = [];
        try {
          // MCP may wrap result in markdown code blocks or text blocks
          let jsonText = result.content?.[0]?.text || '[]';
          
          // Try to extract JSON from markdown format
          // Format might be: ### Result\n```json\n{...}\n```
          const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/) || 
                           jsonText.match(/\{[\s\S]*\}/) ||
                           jsonText.match(/\[[\s\S]*\]/);
          
          if (jsonMatch) {
            jsonText = jsonMatch[1] || jsonMatch[0];
          }
          
          jobs = JSON.parse(jsonText.trim());
          progress(`✓ Parsed ${Array.isArray(jobs) ? jobs.length : 0} job(s) from response`);
        } catch (e) {
          console.error('Error parsing job results:', e);
          console.error('Raw response:', result.content?.[0]?.text?.substring(0, 500));
          progress(`⚠️ Failed to parse results. Raw response preview: ${result.content?.[0]?.text?.substring(0, 100)}`);
          jobs = [];
        }

        progress(`✓ Found ${jobs.length} job listing(s)`);

        // Format results
        if (jobs.length === 0) {
          return `No jobs found on ${config.name} for "${keywords || 'all positions'}" in ${city} (posted within ${hours}h).

Possible reasons:
- No recent job postings matching your criteria
- The website structure may have changed
- Try different search parameters or platform`;
        }

        const formattedJobs = jobs.map((job: any, index: number) => {
          return `${index + 1}. ${job.title}
   Company: ${job.company}
   Location: ${job.location}
   Posted: ${job.postedDate}
   Link: ${job.link}`;
        }).join('\n\n');

        return `✓ Found ${jobs.length} job listing(s) on ${config.name} for "${keywords || 'all positions'}" in ${city}:

${formattedJobs}

Search parameters:
- Location: ${city}
- Posted within: ${hours} hours
- Platform: ${config.name}${keywords ? `\n- Keywords: ${keywords}` : ''}`;

      } finally {
        // Always disconnect the MCP client
        await mcpClient.disconnect();
        progress('🔌 Disconnected from Playwright');
      }
    } catch (error) {
      const errorMsg = (error as Error).message;
      console.error('Job search error:', errorMsg);
      return `Error searching for jobs: ${errorMsg}

Please ensure:
1. @playwright/mcp is installed (npx handles this automatically)
2. You have internet connection
3. The job platform is accessible from your location

Try running: npx @playwright/mcp@latest --help`;
    }
  }
};
