export declare const flattenArray: (
  channelBuffer: Float32Array[],
  recordingLength: number
) => Float32Array;
export declare const interleave: (
  leftChannel: Float32Array,
  rightChannel: Float32Array
) => Float32Array;
export declare const writeUTFBytes: (
  view: DataView,
  offset: number,
  str: string
) => any;
export declare const downsampleBuffer: (
  buffer: Float32Array,
  currentSampleRate: number,
  targetSampleRate: number
) => Float32Array;
