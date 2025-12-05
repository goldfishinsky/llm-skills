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

      progress(`✓ Found yt-dlp, searching YouTube...`);

      // Check if ffmpeg is installed
      let hasFFmpeg = false;
      try {
        await execAsync('which ffmpeg');
        hasFFmpeg = true;
      } catch {
        progress(`⚠️ ffmpeg not found - downloading as m4a instead of mp3`);
      }

      // Use ytsearch to search YouTube and download
      const searchQuery = `ytsearch${downloadCount}:${query}`;
      const outputTemplate = path.join(downloadsPath, '%(title)s.%(ext)s');

      // Build command based on ffmpeg availability
      let command: string;
      if (hasFFmpeg) {
        command = `${ytdlpPath} "${searchQuery}" --extract-audio --audio-format mp3 --audio-quality 0 --output "${outputTemplate}" --print "%(title)s" --no-playlist --max-downloads ${downloadCount} --ignore-errors`;
      } else {
        // Download best audio without conversion if ffmpeg is missing
        command = `${ytdlpPath} "${searchQuery}" -f bestaudio --output "${outputTemplate}" --print "%(title)s" --no-playlist --max-downloads ${downloadCount} --ignore-errors`;
      }

      progress(`⬇️ Downloading ${downloadCount} track(s)...`);

      let stdout = '';
      
      try {
        const result = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer
          timeout: 5 * 60 * 1000 // 5 minutes timeout
        });
        stdout = result.stdout;
      } catch (execError: any) {
        // yt-dlp may return non-zero exit code but still download files
        // Check if we got stdout with titles
        stdout = execError.stdout || '';
        console.log(`yt-dlp exit code ${execError.code}, but checking stdout...`);
        progress(`⚠️ yt-dlp exited with code ${execError.code}, checking results...`);
      }

      const downloadedTitles = stdout.trim().split('\n').filter(line => line && !line.startsWith('[') && !line.includes('ERROR'));
      
      if (downloadedTitles.length === 0) {
        return `No music found for query: "${query}". YouTube might be blocking downloads. Try:\n1. Using a VPN\n2. A different search query\n3. Downloading fewer tracks at once`;
      }

      progress(`✓ Download complete! Found ${downloadedTitles.length} track(s)`);

      const resultLines = downloadedTitles.map((title, i) => 
        `${i + 1}. ${title}`
      );

      let message = `✓ Successfully downloaded ${downloadedTitles.length} track(s) for "${query}":\n\n${resultLines.join('\n')}\n\nSaved to: ${downloadsPath}`;
      
      if (!hasFFmpeg) {
        message += '\n\n⚠️ Note: Files are in m4a/webm format. For MP3 conversion, install ffmpeg:\nbrew install ffmpeg';
      }

      return message;
    } catch (error) {
      const errorMsg = (error as Error).message;
      console.error('Music download error:', errorMsg);
      return `Error downloading music: ${errorMsg}\n\nPlease ensure:\n1. yt-dlp is installed (brew install yt-dlp)\n2. ffmpeg is installed for MP3 conversion (brew install ffmpeg)\n3. You have internet connection`;
    }
  }
};
