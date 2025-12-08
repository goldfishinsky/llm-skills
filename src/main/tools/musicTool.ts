import { Tool } from '../types';
import * as path from 'path';
import { app } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const musicDownloadTool: Tool = {
  id: 'music_download',
  name: 'download_music',
  description: 'Search and download music from YouTube using yt-dlp. Use this tool when the user asks to find, get, or download music, songs, or background music (BGM).  Supports Chinese and English queries.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query for the music in any language (e.g., "悲伤安静的bgm", "sad piano music", "epic orchestral").'
      },
      count: {
        type: 'number',
        description: 'Number of tracks to download (default: 1, max: 5)',
        default: 1
      }
    },
    required: ['query']
  },
  execute: async ({ query, count = 1 }: { query: string; count?: number }, onProgress?: (message: string) => void) => {
    try {
      // Limit count to max 5
      const downloadCount = Math.min(Math.max(1, count), 5);
      
      const progress = (msg: string) => {
        console.log(msg);
        if (onProgress) onProgress(msg);
      };

      progress(`🔍 Searching for "${query}"...`);

      const downloadsPath = app.getPath('downloads');
      
      // Debug: Check environment
      progress(`📋 Debugging environment...`);
      console.log('PATH:', process.env.PATH);
      console.log('Downloads path:', downloadsPath);
      
      // Try to find yt-dlp in PATH
      let ytdlpPath = '/opt/homebrew/bin/yt-dlp';
      try {
        const { stdout: whichOutput } = await execAsync('which yt-dlp');
        ytdlpPath = whichOutput.trim();
        progress(`✓ Found yt-dlp at: ${ytdlpPath}`);
      } catch {
        progress(`⚠️ Using hardcoded path: ${ytdlpPath}`);
      }

      // Check if yt-dlp is installed and accessible
      try {
        const { stdout: versionOutput } = await execAsync(`${ytdlpPath} --version`);
        progress(`✓ yt-dlp version: ${versionOutput.trim()}`);
      } catch (error) {
        return `Error: yt-dlp is not accessible from Electron.\nPath tried: ${ytdlpPath}\nError: ${(error as Error).message}\n\nThis might be a PATH or permission issue. Try using absolute paths or check Electron sandbox settings.`;
      }

      progress(`✓ Found yt-dlp, searching for music...`);

    // Check if ffmpeg is installed
    let hasFFmpeg = false;
    try {
      await execAsync('which ffmpeg');
      hasFFmpeg = true;
    } catch {
      progress(`⚠️ ffmpeg not found - downloading as m4a instead of mp3`);
    }

    // Use ytsr (YouTube search API) instead of ytsearch which is being blocked
    progress(`🔍 Searching YouTube for "${query}"...`);
    
    let videoUrls: string[] = [];
    try {
      // Use ytsr package for searching (需要先安装: npm install ytsr)
      const ytsr = require('ytsr');
      const searchResults = await ytsr(query, { limit: downloadCount });
      
      videoUrls = searchResults.items
        .filter((item: any) => item.type === 'video')
        .slice(0, downloadCount)
        .map((item: any) => item.url);
        
      if (videoUrls.length === 0) {
        throw new Error('No videos found');
      }
      
      progress(`✓ Found ${videoUrls.length} video(s)`);
    } catch (searchError) {
      return `Search failed: ${(searchError as Error).message}\n\nPlease ensure:\n1. You have internet connection\n2. YouTube is accessible\n3. Try a more specific search query`;
    }


    let downloadedFiles: Array<{title: string, path: string}> = [];
  
  // Download each video URL
  progress(`⬇️ Downloading ${videoUrls.length} track(s)...`);
  
  for (let i = 0; i < videoUrls.length; i++) {
    const url = videoUrls[i];
    try {
      // Use predictable temp filename pattern
      const tempPrefix = `ytdl_temp_${Date.now()}_${i}`;
      const outputTemplate = path.join(downloadsPath, `${tempPrefix}.%(ext)s`);
      
      // Build command based on ffmpeg availability
      let command: string;
      if (hasFFmpeg) {
        command = `${ytdlpPath} "${url}" --extract-audio --audio-format mp3 --audio-quality 0 --output "${outputTemplate}" --no-warnings --newline`;
      } else {
        command = `${ytdlpPath} "${url}" -f bestaudio --output "${outputTemplate}" --no-warnings --newline`;
      }
      
      progress(`  📥 Downloading ${i + 1}/${videoUrls.length}...`);
      
      try {
        await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 5 * 60 * 1000
        });
      } catch (execError: any) {
        // Even if command exits with error, file might still be downloaded
        console.log(`yt-dlp exited with code ${execError.code} for ${url}`);
      }
      
      // Find the downloaded file by glob pattern
      const globPattern = path.join(downloadsPath, `${tempPrefix}.*`);
      const glob = require('glob');
      const matchedFiles = glob.sync(globPattern);
      
      if (matchedFiles.length > 0) {
        const tempFilepath = matchedFiles[0];
        const tempExtension = path.extname(tempFilepath);
        
        // Get the actual video title from yt-dlp
        try {
          const titleCommand = `${ytdlpPath} "${url}" --get-title --no-warnings`;
          const titleResult = await execAsync(titleCommand, { timeout: 10000 });
          const videoTitle = titleResult.stdout.trim().split('\n')[0];
          
          // Sanitize title for filename (remove invalid characters)
          const safeTitle = videoTitle
            .replace(/[/\\?%*:|"<>]/g, '-')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 200); // Limit length
          
          // Rename file to proper title
          const newFilepath = path.join(downloadsPath, `${safeTitle}${tempExtension}`);
          
          // Check if file with this name already exists
          let finalPath = newFilepath;
          let counter = 1;
          while (matchedFiles[0] !== finalPath && glob.sync(finalPath).length > 0) {
            finalPath = path.join(downloadsPath, `${safeTitle} (${counter})${tempExtension}`);
            counter++;
          }
          
          // Only rename if not already the target name
          if (tempFilepath !== finalPath) {
            const fsPromises = require('fs').promises;
            await fsPromises.rename(tempFilepath, finalPath);
          }
          
          downloadedFiles.push({ 
            title: safeTitle,
            path: finalPath 
          });
          progress(`  ✓ Downloaded: ${safeTitle}${tempExtension}`);
        } catch (renameError) {
          // If we can't get title or rename, keep temp name
          console.error(`Failed to rename file:`, renameError);
          const filename = path.basename(tempFilepath);
          downloadedFiles.push({ 
            title: filename,
            path: tempFilepath 
          });
          progress(`  ✓ Downloaded: ${filename} (couldn't get proper title)`);
        }
      } else {
        progress(`  ❌ Failed: no file found matching ${tempPrefix}.*`);
        console.error(`No files found matching pattern: ${globPattern}`);
      }
    } catch (error: any) {
      progress(`  ❌ Error downloading track ${i + 1}: ${error.message}`);
      console.error(`Failed to download ${url}:`, error);
    }
  }
  
  if (downloadedFiles.length === 0) {
    return `❌ Failed to download any music for "${query}".\n\nPossible issues:\n1. YouTube may be blocking downloads\n2. Try using a VPN\n3. Check your internet connection\n4. Try a different search query`;
  }

  progress(`✓ Download complete! Successfully downloaded ${downloadedFiles.length}/${videoUrls.length} track(s)`);

  const resultLines = downloadedFiles.map((file, i) => 
    `${i + 1}. ${file.title}`
  );

  let message = `✓ Successfully downloaded ${downloadedFiles.length} track(s) for "${query}":\n\n${resultLines.join('\n')}\n\nSaved to: ${downloadsPath}`;
  
  if (!hasFFmpeg) {
    message += '\n\n⚠️ Note: Files are in m4a/webm format. For MP3 conversion, install ffmpeg:\nbrew install ffmpeg';
  }
  
  if (downloadedFiles.length < videoUrls.length) {
    message += `\n\n⚠️ ${videoUrls.length - downloadedFiles.length} track(s) failed to download`;
  }

  return message;
    } catch (error) {
      const errorMsg = (error as Error).message;
      console.error('Music download error:', errorMsg);
      return `Error downloading music: ${errorMsg}\n\nPlease ensure:\n1. yt-dlp is installed (brew install yt-dlp)\n2. ffmpeg is installed for MP3 conversion (brew install ffmpeg)\n3. You have internet connection`;
    }
  }
};
