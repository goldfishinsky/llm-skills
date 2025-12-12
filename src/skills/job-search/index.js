
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

// Platform configurations
const PLATFORM_CONFIGS = {
  linkedin: {
    name: 'LinkedIn',
    buildUrl: (city, hours, keywords) => {
      const params = new URLSearchParams({
        location: city,
        f_TPR: `r${hours * 3600}`,
        position: '1',
        pageNum: '0'
      });
      if (keywords) params.set('keywords', keywords);
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
    buildUrl: (city, hours, keywords) => {
      const params = new URLSearchParams({
        l: city,
        fromage: Math.ceil(hours / 24).toString(),
      });
      if (keywords) params.set('q', keywords);
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
    buildUrl: (city, hours, keywords) => {
      const params = new URLSearchParams({
        'sc.keyword': keywords || '',
        'locT': 'C',
        'locId': '3991', // TODO: Dynamic ID
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

// Parameters
const city = process.env.PARAM_CITY;
const hours = parseInt(process.env.PARAM_HOURS || '24', 10);
const platform = (process.env.PARAM_PLATFORM || 'linkedin').toLowerCase();
const keywords = process.env.PARAM_KEYWORDS || '';
const limit = parseInt(process.env.PARAM_LIMIT || '10', 10);

async function main() {
  if (!city) {
    console.error('Error: Missing city parameter');
    process.exit(1);
  }

  const config = PLATFORM_CONFIGS[platform];
  if (!config) {
    console.error(`Error: Unsupported platform "${platform}"`);
    process.exit(1);
  }

  console.log(`🔍 Searching ${config.name} for jobs in ${city}...`);
  const searchUrl = config.buildUrl(city, hours, keywords);
  
  // Connect to MCP Server (Playwright)
  // We assume npx is available
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['@playwright/mcp@latest']
  });

  const client = new Client({
    name: "job-search-client",
    version: "1.0.0",
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log('✓ Connected to Playwright MCP');

    // Navigate
    await client.callTool({
        name: 'browser_navigate',
        arguments: { url: searchUrl }
    });
    
    // Wait
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract
    const expression = `JSON.stringify(
      Array.from(document.querySelectorAll('${config.selectors.jobCard}')).slice(0, ${limit}).map(card => ({
        title: card.querySelector('${config.selectors.title}')?.getAttribute('title') || card.querySelector('${config.selectors.title}')?.textContent?.trim() || '',
        company: card.querySelector('${config.selectors.company}')?.textContent?.trim() || '',
        location: card.querySelector('${config.selectors.location}')?.textContent?.trim() || '',
        link: (card.querySelector('${config.selectors.link}')?.getAttribute('href') || '').startsWith('http') 
          ? card.querySelector('${config.selectors.link}')?.getAttribute('href') 
          : 'https://www.${platform}.com' + (card.querySelector('${config.selectors.link}')?.getAttribute('href') || ''),
        postedDate: card.querySelector('${config.selectors.date}')?.textContent?.trim() || ''
      })).filter(job => job.title && job.company)
    )`;

    const result = await client.callTool({
        name: 'browser_evaluate',
        arguments: { expression }
    });

    const jobsText = result.content[0].text;
    const jobs = JSON.parse(jobsText);

    console.log(`✅ Found ${jobs.length} job(s)`);
    
    if (jobs.length > 0) {
      console.log(JSON.stringify(jobs, null, 2));
    } else {
      console.log('No jobs found.');
    }

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  } finally {
    await client.close(); 
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
