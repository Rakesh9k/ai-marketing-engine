import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import * as admin from 'firebase-admin';
import ffmpegStatic from 'ffmpeg-static';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffprobeStatic = require('ffprobe-static') as { path: string };
import { spawn } from 'child_process';
import { GoogleAuth } from 'google-auth-library';

const FFMPEG = ffmpegStatic as unknown as string;
const FFPROBE = (ffprobeStatic as any).path;
const BUCKET_NAME = 'brainwise-ai-marketing-engine.firebasestorage.app';
const CLOUD_RUN_URL = 'https://reel-renderer-64pminaxoq-el.a.run.app';

class CloudRunVideoRenderer {
  private readonly baseUrl: string;
  private readonly auth: GoogleAuth;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.auth = new GoogleAuth();
  }

  private async authHeader(): Promise<Record<string, string>> {
    const client = await this.auth.getIdTokenClient(this.baseUrl);
    const headers = await client.getRequestHeaders();
    return headers as unknown as Record<string, string>;
  }

  async analyzeClip(input: any): Promise<any> {
    const headers = await this.authHeader();
    const response = await fetch(`${this.baseUrl}/analyze-clip`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error(`Renderer analyze-clip failed (${response.status}): ${await response.text()}`);
    }
    return await response.json();
  }

  async renderReel(input: any): Promise<any> {
    const headers = await this.authHeader();
    const response = await fetch(`${this.baseUrl}/render`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error(`Renderer render failed (${response.status}): ${await response.text()}`);
    }
    return await response.json();
  }
}

function runCmd(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`Command ${cmd} exited with code ${code}: ${stderr}`));
    });
  });
}

async function main() {
  console.log('--- STARTING END-TO-END REAL CLOUD RUN RENDER TEST ---');
  console.log('Target Cloud Run URL:', CLOUD_RUN_URL);
  
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket: BUCKET_NAME,
    });
  }
  const bucket = admin.storage().bucket(BUCKET_NAME);

  const workDir = path.join(os.tmpdir(), `e2e-render-${randomUUID()}`);
  await fs.mkdir(workDir, { recursive: true });
  console.log('Local work dir:', workDir);

  try {
    // 1. Synthesize 3 test clips (portrait + landscape), music, logo
    const clip1Local = path.join(workDir, 'clip1.mp4');
    const clip2Local = path.join(workDir, 'clip2.mp4');
    const clip3Local = path.join(workDir, 'clip3.mp4');
    const musicLocal = path.join(workDir, 'music.mp3');
    const logoLocal = path.join(workDir, 'logo.png');

    console.log('1. Synthesizing test video/audio assets with ffmpeg...');
    await runCmd(FFMPEG, ['-y', '-f', 'lavfi', '-i', 'testsrc=duration=4:size=640x480:rate=30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', clip1Local]);
    await runCmd(FFMPEG, ['-y', '-f', 'lavfi', '-i', 'testsrc2=duration=4:size=1080x1920:rate=30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', clip2Local]);
    await runCmd(FFMPEG, ['-y', '-f', 'lavfi', '-i', 'smptebars=duration=4:size=720x1280:rate=30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', clip3Local]);
    await runCmd(FFMPEG, ['-y', '-f', 'lavfi', '-i', 'sine=frequency=523:duration=15', '-c:a', 'libmp3lame', musicLocal]);
    await runCmd(FFMPEG, ['-y', '-f', 'lavfi', '-i', 'color=c=orange:s=200x200:d=1', '-vframes', '1', logoLocal]);

    // 2. Upload assets to Firebase Storage
    console.log('2. Uploading assets to Firebase Storage bucket...');
    const prefix = `e2e-test-${randomUUID()}`;
    const clip1Path = `businesses/${prefix}/clips/clip1.mp4`;
    const clip2Path = `businesses/${prefix}/clips/clip2.mp4`;
    const clip3Path = `businesses/${prefix}/clips/clip3.mp4`;
    // NEVER write to shared/reel-music/: that is the production music library. This script once
    // overwrote energetic_01.mp3 there with a 15 s sine tone on every run. Test music is scoped to
    // the throwaway business prefix and deleted with it.
    const musicPath = `businesses/${prefix}/music/test-tone.mp3`;
    const logoPath = `businesses/${prefix}/logo.png`;

    await bucket.upload(clip1Local, { destination: clip1Path, metadata: { contentType: 'video/mp4' } });
    await bucket.upload(clip2Local, { destination: clip2Path, metadata: { contentType: 'video/mp4' } });
    await bucket.upload(clip3Local, { destination: clip3Path, metadata: { contentType: 'video/mp4' } });
    await bucket.upload(musicLocal, { destination: musicPath, metadata: { contentType: 'audio/mpeg' } });
    await bucket.upload(logoLocal, { destination: logoPath, metadata: { contentType: 'image/png' } });

    console.log('   Source assets uploaded to Storage successfully.');

    // 3. Initialize CloudRunVideoRenderer HTTP client
    const renderer = new CloudRunVideoRenderer(CLOUD_RUN_URL);

    // 4. Test /analyze-clip
    console.log('3. Calling POST /analyze-clip on Cloud Run (OIDC authenticated)...');
    const analyzeOutput = await renderer.analyzeClip({ clipId: 'clip1', storagePath: clip1Path });
    console.log('   /analyze-clip response:', analyzeOutput);

    if (analyzeOutput.width !== 640 || analyzeOutput.height !== 480) {
      throw new Error(`Unexpected dimensions in analyzeClip: ${analyzeOutput.width}x${analyzeOutput.height}`);
    }
    const [thumbExists] = await bucket.file(analyzeOutput.thumbnailStoragePath).exists();
    if (!thumbExists) {
      throw new Error(`Extracted thumbnail does not exist in Storage: ${analyzeOutput.thumbnailStoragePath}`);
    }
    console.log('   /analyze-clip PASS!');

    // 5. Test /render with multilingual captions, hook, offer, ending, transitions
    console.log('4. Calling POST /render on Cloud Run (OIDC authenticated)...');
    const outputStoragePath = `businesses/${prefix}/output/reel.mp4`;
    const thumbnailStoragePath = `businesses/${prefix}/output/thumbnail.jpg`;

    const renderInput = {
      reelId: `reel-${prefix}`,
      businessId: prefix,
      durationSeconds: 15,
      style: 'fast_engaging',
      plan: {
        templateId: 'food_reveal',
        hook: { text: 'Fresh Tasty Bites!', durationMs: 1500 },
        segments: [
          { clipId: 'clip1', startMs: 0, endMs: 2000, text: 'Delicious food made daily', transitionIn: 'fade' },
          { clipId: 'clip2', startMs: 500, endMs: 2500, text: 'स्वादिष्ट खाना और बेहतरीन जायका', transitionIn: 'hard_cut' },
          { clipId: 'clip3', startMs: 200, endMs: 2200, text: 'రుచికరమైన ఆహారం మరియు పానీయాలు', transitionIn: 'zoom_punch' },
        ],
        offer: { text: 'Special Offer: 20% OFF Today!', durationMs: 1500 },
        ending: { text: 'Visit Brainwise Cafe Today', durationMs: 2000, cta: 'Order Now', whatsapp: '9876543210', location: 'Hyderabad, India' },
        musicTrackId: 'energetic_01',
        totalDurationMs: 15000,
      },
      clips: [
        { clipId: 'clip1', storagePath: clip1Path },
        { clipId: 'clip2', storagePath: clip2Path },
        { clipId: 'clip3', storagePath: clip3Path },
      ],
      music: {
        id: 'energetic_01',
        name: 'Upbeat Local Market',
        category: 'energetic',
        mood: 'fast, punchy',
        durationSeconds: 45,
        license: 'Mitra Original',
        source: 'In-house',
        attributionRequired: false,
        recommendedVolume: 0.24,
        storagePath: musicPath,
      },
      brand: {
        businessName: 'Brainwise Cafe',
        logoStoragePath: logoPath,
        primaryColor: '#e63946',
        locationText: 'Hyderabad, Telangana',
      },
      outputStoragePath,
      thumbnailStoragePath,
    };

    const renderOutput = await renderer.renderReel(renderInput);
    console.log('   /render response:', renderOutput);

    // 6. Verify generated MP4 and thumbnail exist in Storage and download them
    console.log('5. Verifying output MP4 and thumbnail in Storage...');
    const [mp4Exists] = await bucket.file(outputStoragePath).exists();
    const [finalThumbExists] = await bucket.file(thumbnailStoragePath).exists();

    if (!mp4Exists || !finalThumbExists) {
      throw new Error(`Rendered outputs missing from Storage! MP4: ${mp4Exists}, Thumb: ${finalThumbExists}`);
    }

    const outputMp4Local = path.join(workDir, 'rendered_reel.mp4');
    const outputThumbLocal = path.join(workDir, 'rendered_thumb.jpg');

    await bucket.file(outputStoragePath).download({ destination: outputMp4Local });
    await bucket.file(thumbnailStoragePath).download({ destination: outputThumbLocal });

    // 7. Probe generated MP4 with local ffprobe
    console.log('6. Probing generated MP4 with ffprobe...');
    const probeJsonStr = await runCmd(FFPROBE, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      outputMp4Local,
    ]);
    const probeResult = JSON.parse(probeJsonStr);
    const videoStream = probeResult.streams.find((s: any) => s.codec_type === 'video');
    const audioStream = probeResult.streams.find((s: any) => s.codec_type === 'audio');
    const mp4Stat = await fs.stat(outputMp4Local);

    console.log('   Video Stream:', { codec: videoStream?.codec_name, width: videoStream?.width, height: videoStream?.height, duration: probeResult.format.duration });
    console.log('   Audio Stream:', { codec: audioStream?.codec_name, sample_rate: audioStream?.sample_rate });
    console.log('   Rendered MP4 Size (bytes):', mp4Stat.size);

    if (videoStream?.width !== 1080 || videoStream?.height !== 1920) {
      throw new Error(`Rendered video dimensions mismatch! Expected 1080x1920, got ${videoStream?.width}x${videoStream?.height}`);
    }
    if (!audioStream) {
      throw new Error('Rendered video has no audio stream!');
    }
    if (mp4Stat.size < 100_000) {
      throw new Error(`Rendered MP4 size is suspiciously small: ${mp4Stat.size} bytes`);
    }

    console.log('\n================================================================');
    console.log('🎉 REAL END-TO-END CLOUD RUN RENDER TEST PASSED SUCCESSFULLY!');
    console.log('================================================================');
    
    // Clean up test files in Storage
    await bucket.deleteFiles({ prefix: `businesses/${prefix}/` }).catch(() => undefined);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

main().catch((err) => {
  console.error('\n❌ END-TO-END RENDER TEST FAILED:', err);
  process.exitCode = 1;
});
