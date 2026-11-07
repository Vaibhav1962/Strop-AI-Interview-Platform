/**
 * Encodes Float32Array PCM audio samples into a standard 16kHz 16-bit mono WAV Blob.
 * 100% compliant with standard RIFF WAV format for ElevenLabs Scribe and Whisper.
 */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  // Downsample to 16000Hz if needed for minimum payload and optimal Scribe acoustic modeling
  const targetSampleRate = 16000;
  let downsampled: Float32Array;

  if (sampleRate === targetSampleRate) {
    downsampled = samples;
  } else {
    // Average each source window instead of picking single samples: picking skips samples and
    // aliases high frequencies into the speech band, which noticeably hurts recognition accuracy.
    const ratio = sampleRate / targetSampleRate;
    const newLength = Math.round(samples.length / ratio);
    downsampled = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.min(samples.length, Math.max(start + 1, Math.floor((i + 1) * ratio)));
      let sum = 0;
      for (let j = start; j < end; j++) sum += samples[j];
      downsampled[i] = sum / (end - start);
    }
  }

  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = targetSampleRate * blockAlign;
  const dataByteCount = downsampled.length * bytesPerSample;

  const buffer = new ArrayBuffer(44 + dataByteCount);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataByteCount, true);
  writeString(view, 8, "WAVE");

  // "fmt " sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels (1 = mono)
  view.setUint32(24, targetSampleRate, true); // SampleRate (16000)
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample (16-bit)

  // "data" sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataByteCount, true);

  // Write 16-bit integer PCM samples
  let offset = 44;
  for (let i = 0; i < downsampled.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, downsampled[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

