'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./microphone-js.cjs.production.min.js');
} else {
  module.exports = require('./microphone-js.cjs.development.js');
}
