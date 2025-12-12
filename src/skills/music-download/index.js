
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const glob = require('glob');
const ytsr = require('ytsr');

const execAsync = promisify(exec);

// Get parameters from environment variables
const query = process.env.PARAM_QUERY;
const count = parseInt(process.env.PARAM_COUNT || '1', 10);
const downloadsPath = process.env.DOWNLOADS_PATH || process.cwd(); // Fallback if not provided

async function main() {
  if (!query) {
    console.error('Error: Missing query parameter');
    process.exit(1);
  }

  const downloadCount = Math.min(Math.max(1, count), 5);
  
  console.log(`🔍 Searching for "${query}"...`);

  // Check for yt-dlp
  let ytdlpPath = 'yt-dlp';
  try {
    const { stdout } = await execAsync('which yt-dlp');
    ytdlpPath = stdout.trim();
  } catch (e) {
    // Try common paths
    if (fs.existsSync('/opt/homebrew/bin/yt-dlp')) {
      ytdlpPath = '/opt/homebrew/bin/yt-dlp';
    } else if (fs.existsSync('/usr/local/bin/yt-dlp')) {
      ytdlpPath = '/usr/local/bin/yt-dlp';
    }
  }

  // Check ffmpeg
  let hasFFmpeg = false;
  try {
    await execAsync('which ffmpeg');
    hasFFmpeg = true;
  } catch (e) {}

  if (!hasFFmpeg) {
    console.log('⚠️ ffmpeg not found - downloading as m4a/webm instead of mp3');
  }

  // Search YouTube
  let videoUrls = [];
  try {
    const searchResults = await ytsr(query, { limit: downloadCount });
    videoUrls = searchResults.items
      .filter(item => item.type === 'video')
      .slice(0, downloadCount)
      .map(item => item.url);
      
    if (videoUrls.length === 0) {
      console.error('No videos found');
      process.exit(1);
    }
    console.log(`✓ Found ${videoUrls.length} video(s)`);
  } catch (error) {
    console.error(`Search failed: ${error.message}`);
    process.exit(1);
  }

  // Download
  const downloadedFiles = [];
  console.log(`⬇️ Downloading ${videoUrls.length} track(s) to ${downloadsPath}...`);

  for (let i = 0; i < videoUrls.length; i++) {
    const url = videoUrls[i];
    const tempPrefix = `ytdl_temp_${Date.now()}_${i}`;
    const outputTemplate = path.join(downloadsPath, `${tempPrefix}.%(ext)s`);
    
    let command;
    if (hasFFmpeg) {
      command = `"${ytdlpPath}" "${url}" --extract-audio --audio-format mp3 --audio-quality 0 --output "${outputTemplate}" --no-warnings --newline`;
    } else {
      command = `"${ytdlpPath}" "${url}" -f bestaudio --output "${outputTemplate}" --no-warnings --newline`;
    }

    console.log(`  📥 Downloading ${i + 1}/${videoUrls.length}...`);
    
    try {
      await execAsync(command, { maxBuffer: 50 * 1024 * 1024, timeout: 300000 });
      
      // Find downloaded file
      const matchedFiles = glob.sync(path.join(downloadsPath, `${tempPrefix}.*`));
      if (matchedFiles.length > 0) {
        const tempFilepath = matchedFiles[0];
        const tempExtension = path.extname(tempFilepath);
        
        // Get title
        let safeTitle = `music_${Date.now()}_${i}`;
        try {
          const { stdout } = await execAsync(`"${ytdlpPath}" "${url}" --get-title --no-warnings`);
          safeTitle = stdout.trim()
            .replace(/[/\\?%*:|"<>]/g, '-')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 200);
        } catch (e) {}

        const finalPath = path.join(downloadsPath, `${safeTitle}${tempExtension}`);
        
        // Rename
        if (tempFilepath !== finalPath) {
            // Check if exists
            if (fs.existsSync(finalPath)) {
                const altPath = path.join(downloadsPath, `${safeTitle}_${Date.now()}${tempExtension}`);
                fs.renameSync(tempFilepath, altPath);
                downloadedFiles.push({ title: safeTitle, path: altPath });
            } else {
                fs.renameSync(tempFilepath, finalPath);
                downloadedFiles.push({ title: safeTitle, path: finalPath });
            }
        } else {
            downloadedFiles.push({ title: safeTitle, path: finalPath });
        }
        console.log(`  ✓ Downloaded: ${safeTitle}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to download ${url}: ${error.message}`);
    }
  }

  if (downloadedFiles.length === 0) {
    console.error('Failed to download any files');
    process.exit(1);
  }

  console.log(`✓ Successfully downloaded ${downloadedFiles.length} track(s)`);
  console.log(JSON.stringify(downloadedFiles)); // Output JSON for structured parsing if needed
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
