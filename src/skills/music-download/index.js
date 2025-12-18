
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
const downloadsPath = process.env.DOWNLOADS_PATH || require('os').homedir() + '/Downloads';

async function main() {
  if (!query) {
    console.error('Error: Missing query parameter');
    process.exit(1);
  }

  const downloadCount = Math.min(Math.max(1, count), 5);
  
  console.log(`🔍 Searching for "${query}"...`);

  // Try to find yt-dlp
  let ytdlpPath = 'yt-dlp';
  const commonPaths = [
    '/opt/homebrew/bin/yt-dlp',
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp'
  ];

  try {
    const { stdout } = await execAsync('which yt-dlp');
    ytdlpPath = stdout.trim();
  } catch (e) {
    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        ytdlpPath = p;
        break;
      }
    }
  }

  // Check if yt-dlp works
  try {
    await execAsync(`"${ytdlpPath}" --version`);
    console.log(`✓ Using yt-dlp at: ${ytdlpPath}`);
  } catch (error) {
    console.error(`Error: yt-dlp not found or not working.\n${error.message}`);
    process.exit(1);
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
      
      const matchedFiles = glob.sync(path.join(downloadsPath, `${tempPrefix}.*`));
      if (matchedFiles.length > 0) {
        const tempFilepath = matchedFiles[0];
        const tempExtension = path.extname(tempFilepath);
        
        let safeTitle = '';
        try {
          const { stdout } = await execAsync(`"${ytdlpPath}" "${url}" --get-title --no-warnings`);
          safeTitle = stdout.trim()
            .replace(/[/\\?%*:|"<>]/g, '-')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 200);
        } catch (e) {
          safeTitle = `music_${Date.now()}_${i}`;
        }

        let finalPath = path.join(downloadsPath, `${safeTitle}${tempExtension}`);
        
        // Handle name collisions
        let counter = 1;
        while (fs.existsSync(finalPath) && finalPath !== tempFilepath) {
          finalPath = path.join(downloadsPath, `${safeTitle}_(${counter})${tempExtension}`);
          counter++;
        }
        
        fs.renameSync(tempFilepath, finalPath);
        downloadedFiles.push({ title: safeTitle, path: finalPath });
        console.log(`  ✓ Downloaded: ${path.basename(finalPath)}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to download ${url}: ${error.message}`);
    }
  }

  if (downloadedFiles.length === 0) {
    console.error('Failed to download any files');
    process.exit(1);
  }

  console.log(`✓ Successfully downloaded ${downloadedFiles.length} track(s) to ${downloadsPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
