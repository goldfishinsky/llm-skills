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
  execute: async function execute(args: unknown, onProgress?: (status: string) => void): Promise<string> {
    try {
      // Parse and validate arguments
      const params = args as { city?: string; hours?: number; platform?: string; keywords?: string; resultLimit?: number; headless?: boolean };
      const {
        city = 'San Francisco',
        hours = 24,
        platform = 'indeed',
        keywords = '',
        resultLimit = 10
      } = params;

      const platformKey = platform.toLowerCase() as keyof typeof PLATFORM_CONFIGS;
      if (!PLATFORM_CONFIGS[platformKey]) {
        return `Error: Unsupported platform "${platform}". Supported platforms: linkedin, indeed, glassdoor`;
      }

      const config = PLATFORM_CONFIGS[platformKey];
      const progress = (msg: string) => onProgress?.(msg);
      
      try {
        progress(`🔍 Searching ${config.name} for jobs in ${city} (posted within ${hours}h)...`);
        
        const searchUrl = config.buildUrl(city, hours, keywords);
        progress(`📍 Target URL: ${searchUrl}`);
        
        // Initialize MCP client
        const mcpClient = new MCPClient({
          command: 'npx',
          args: ['@playwright/mcp@latest'],
          env: {}
        });
        
        try {
          await mcpClient.connect();
          progress('✓ Connected to Playwright MCP');
          
          // Navigate to search page
          await mcpClient.callTool('browser_navigate', { url: searchUrl });
          progress('✓ Page loaded');
          
          // Wait a moment for content
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Extract jobs using MCP evaluate
          const result = await mcpClient.callTool('browser_evaluate', {
            expression: `JSON.stringify(
              Array.from(document.querySelectorAll('${config.selectors.jobCard}')).slice(0, ${resultLimit}).map(card => ({
                title: card.querySelector('${config.selectors.title}')?.getAttribute('title') || card.querySelector('${config.selectors.title}')?.textContent?.trim() || '',
                company: card.querySelector('${config.selectors.company}')?.textContent?.trim() || '',
                location: card.querySelector('${config.selectors.location}')?.textContent?.trim() || '',
                link: (card.querySelector('${config.selectors.link}')?.getAttribute('href') || '').startsWith('http') 
                  ? card.querySelector('${config.selectors.link}')?.getAttribute('href') 
                  : 'https://www.${platform}.com' + (card.querySelector('${config.selectors.link}')?.getAttribute('href') || ''),
                postedDate: card.querySelector('${config.selectors.date}')?.textContent?.trim() || ''
              })).filter(job => job.title && job.company)
            )`
          });
          
          // Parse result
          let jobsText = result.content?.[0]?.text || '[]';
          const jobs = JSON.parse(jobsText);
          
          progress(`✅ Found ${jobs.length} job(s)`);
          
          // Disconnect
          await mcpClient.disconnect();
          
          // Format results
          if (jobs.length === 0) {
            return `No jobs found on ${config.name} for "${keywords || 'all positions'}" in ${city}`;
          }
          
          const formattedJobs = jobs.map((job: any, i: number) => 
            `${i + 1}. ${job.title}\n   Company: ${job.company}\n   Location: ${job.location}\n   Link: ${job.link}`
          ).join('\n\n');
          
          return `✓ Found ${jobs.length} job(s) on ${config.name}:\n\n${formattedJobs}`;
          
        } finally {
          await mcpClient.disconnect().catch(() => {});
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
    } catch (outerError) {
      return `Fatal error: ${(outerError as Error).message}`;
    }
  }
};
