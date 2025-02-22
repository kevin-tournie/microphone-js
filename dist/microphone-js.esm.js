var flattenArray = function flattenArray(channelBuffer, recordingLength) {
  var offset = 0;
  return channelBuffer.reduce(function(acc, buffer) {
    acc.set(buffer, offset);
    offset += buffer.length;
    return acc;
  }, new Float32Array(recordingLength));
};
var interleave = function interleave(leftChannel, rightChannel) {
  var length = leftChannel.length + rightChannel.length;
  return leftChannel.reduce(function(acc, _, index) {
    var offset = index * 2;
    acc[offset] = leftChannel[index];
    acc[offset + 1] = leftChannel[index];
    return acc;
  }, new Float32Array(length));
};
var writeUTFBytes = function writeUTFBytes(view, offset, str) {
  str
    .split('')
    .map(function(_, index) {
      return str.charCodeAt(index);
    })
    .forEach(function(value, idx) {
      view.setUint8(offset + idx, value);
    });
};
var downsampleBuffer = function downsampleBuffer(
  buffer,
  currentSampleRate,
  targetSampleRate
) {
  if (targetSampleRate === currentSampleRate) {
    return buffer;
  }

  var sampleRateRatio = currentSampleRate / targetSampleRate;
  var newLength = Math.round(buffer.length / sampleRateRatio);
  var result = new Float32Array(newLength);
  var offsetResult = 0;
  var offsetBuffer = 0;

  while (offsetResult < result.length) {
    var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    var accum = 0,
      count = 0;

    for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }

    result[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
};

var NB_CHANNELS = 2;
var DEFAULT_SAMPLE_RATE = 44100;
var BUFFER_SIZE = 2048;
var LEFT_CHAN_DATA = 0;
var RIGHT_CHAN_DATA = 1;

var initialState = function initialState() {
  return {
    leftChan: [],
    rightChan: [],
    recordingLength: 0,
  };
};

var Microphone = function Microphone(instanceConfig) {
  var mediaStream;
  var source;
  var recorder;
  var blob;
  var audioState = initialState();
  var isMono = !!(instanceConfig && instanceConfig.isMono);
  var nbChannels = isMono ? 1 : NB_CHANNELS;
  var sampleRate =
    (instanceConfig && instanceConfig.sampleRate) || DEFAULT_SAMPLE_RATE;
  var config = {
    nbChannels: nbChannels,
    sampleRate: sampleRate,
    bufferSize: BUFFER_SIZE,
    byteRate: sampleRate * nbChannels * 2,
  };

  var start = function start() {
    try {
      return Promise.resolve(
        navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        })
      ).then(function(_navigator$mediaDevic) {
        mediaStream = _navigator$mediaDevic;
        var audioCtx = new AudioContext();
        var volume = audioCtx.createGain();
        source = audioCtx.createMediaStreamSource(mediaStream);
        var numberOfInputChannels = 2;
        var numberOfOutputChannels = 2;
        recorder = audioCtx.createScriptProcessor(
          config.bufferSize,
          numberOfInputChannels,
          numberOfOutputChannels
        );

        recorder.onaudioprocess = function(event) {
          var left = new Float32Array(
            event.inputBuffer.getChannelData(LEFT_CHAN_DATA)
          );
          audioState.leftChan.push(left);
          audioState.rightChan.push(
            new Float32Array(event.inputBuffer.getChannelData(RIGHT_CHAN_DATA))
          );
          audioState.recordingLength += config.bufferSize;

          if (instanceConfig && instanceConfig.onData) {
            instanceConfig.onData(left);
          }
        };

        source.connect(volume);
        source.connect(recorder);
        recorder.connect(audioCtx.destination);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  var reset = function reset() {
    audioState = initialState();
  }; // // http://soundfile.sapp.org/doc/WaveFormat/

  var encodeWav = function encodeWav(data) {
    var arrayBuffer = new ArrayBuffer(44 + data.length * 2);
    var view = new DataView(arrayBuffer);
    writeUTFBytes(view, 0, 'RIFF');
    view.setUint32(4, 44 + data.length * 2, true);
    writeUTFBytes(view, 8, 'WAVE');
    writeUTFBytes(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, config.nbChannels, true);
    view.setUint32(24, config.sampleRate, true);
    view.setUint32(28, config.byteRate, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    writeUTFBytes(view, 36, 'data');
    view.setUint32(40, data.length * 2, true);

    for (var i = 0; i < data.length; i++) {
      view.setInt16(44 + i * 2, data[i] * 0x7fff, true);
    }

    return new Blob([view], {
      type: 'audio/wav',
    });
  };

  var stop = function stop() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(function(track) {
        return track.stop();
      });
    }

    if (recorder) {
      recorder.disconnect();
    }

    if (source) {
      source.disconnect();
    }

    var leftChanData = flattenArray(
      audioState.leftChan,
      audioState.recordingLength
    );
    var rightChanData = flattenArray(
      audioState.rightChan,
      audioState.recordingLength
    );
    var array = isMono ? leftChanData : interleave(leftChanData, rightChanData);
    var downsampled = downsampleBuffer(
      array,
      DEFAULT_SAMPLE_RATE,
      config.sampleRate
    );
    blob = encodeWav(downsampled);
  };

  var download = function download() {
    var blob = getBlob();

    if (!blob || !window || !document || !URL) {
      return;
    }

    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    document.body.appendChild(a);
    a.href = url;
    a.download = new Date().toISOString() + '.wav';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  var getBlob = function getBlob() {
    return blob;
  };

  return {
    start: start,
    stop: stop,
    reset: reset,
    download: download,
    getBlob: getBlob,
  };
};

export { Microphone };
//# sourceMappingURL=microphone-js.esm.js.map
