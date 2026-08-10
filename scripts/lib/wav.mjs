// Minimal PCM WAV reader (16-bit or 32-bit float, mono or stereo). No dependencies —
// this project deliberately avoids pulling in an audio-decoding library for a task
// this small. Convert other formats to WAV with ffmpeg before analysis, e.g.:
//   ffmpeg -i track.mp3 -ar 44100 -ac 1 track.wav

import { readFile } from 'node:fs/promises';

export async function readWav(filePath) {
  const buffer = await readFile(filePath);
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${filePath} is not a RIFF/WAVE file.`);
  }

  let offset = 12;
  let fmt = null;
  let dataStart = -1;
  let dataLength = 0;

  while (offset < buffer.length - 8) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const bodyStart = offset + 8;

    if (chunkId === 'fmt ') {
      fmt = {
        audioFormat: buffer.readUInt16LE(bodyStart),
        numChannels: buffer.readUInt16LE(bodyStart + 2),
        sampleRate: buffer.readUInt32LE(bodyStart + 4),
        bitsPerSample: buffer.readUInt16LE(bodyStart + 14)
      };
    } else if (chunkId === 'data') {
      dataStart = bodyStart;
      dataLength = chunkSize;
    }

    offset = bodyStart + chunkSize + (chunkSize % 2);
  }

  if (!fmt || dataStart === -1) throw new Error(`${filePath}: missing fmt or data chunk.`);

  const { numChannels, sampleRate, bitsPerSample, audioFormat } = fmt;
  const bytesPerSample = bitsPerSample / 8;
  const frameCount = Math.floor(dataLength / (bytesPerSample * numChannels));
  const mono = new Float32Array(frameCount);

  for (let i = 0; i < frameCount; i++) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const sampleOffset = dataStart + (i * numChannels + ch) * bytesPerSample;
      let sample;
      if (audioFormat === 3 && bitsPerSample === 32) {
        sample = buffer.readFloatLE(sampleOffset);
      } else if (bitsPerSample === 16) {
        sample = buffer.readInt16LE(sampleOffset) / 32768;
      } else if (bitsPerSample === 8) {
        sample = (buffer.readUInt8(sampleOffset) - 128) / 128;
      } else {
        throw new Error(`Unsupported bitsPerSample: ${bitsPerSample}`);
      }
      sum += sample;
    }
    mono[i] = sum / numChannels;
  }

  return { sampleRate, samples: mono };
}
