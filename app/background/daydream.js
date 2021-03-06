
/**
 * Module dependencies.
 */

var Analytics = require('./analytics-node');
var Emitter = require('component/emitter');
var uid  = require('matthewmueller/uid');
var each = require('component/each');
var os = require('component/os');
var fmt = require('yields/fmt');

/**
 * Analytics.
 */

var analytics = new Analytics('J0KCCfAPH6oXQJ8Np1IwI0HgAGW5oFOX');

var userId = localStorage['userId'];

if (!userId) {
  userId = uid();
  localStorage['userId'] = userId;
}

/**
 * Expose `Daydream`.
 */

module.exports = Daydream;

/**
 * Daydream.
 */

function Daydream () {
  if (!(this instanceof Daydream)) return new Daydream();
  this.isRunning = false;
  return this;
}

/**
 * Mixin.
 */

Emitter(Daydream.prototype);

/**
 * Boot.
 */

Daydream.prototype.boot = function () {
  var self = this;

  analytics.identify({
    userId: userId,
    version: chrome.app.getDetails().version,
    languages: window.navigator.languages
  });

  chrome.browserAction.onClicked.addListener(function () {
    if (!self.isRunning) {
      self.emit('start');

      analytics.track({
        userId: userId,
        event: 'Clicked icon',
        start: true,
        stop: false,
        background: true
      });
    } else {
      self.emit('stop');
      
      analytics.track({
        userId: userId,
        event: 'Clicked icon',
        start: false,
        stop: true,
        background: true
      });
    }
    self.isRunning = !self.isRunning;
  });
};

/**
 * Set the icon.
 *
 * @param {String} color
 */

Daydream.prototype.setIcon = function (color) {
  if (color === "green") return chrome.browserAction.setIcon({path: 'images/icon-green.png'});
  if (color === "black") return chrome.browserAction.setIcon({path: 'images/icon-black.png'});
};

/**
 * Show the popup.
 */

Daydream.prototype.showPopup = function () {
  analytics.track({
    userId: userId,
    event: 'Displayed Popup',
    background: true
  });
  chrome.browserAction.setPopup({popup: 'index.html'});
  chrome.browserAction.setBadgeText({text: '1'});
};

/**
 * Parse the recording.
 *
 * @param {Array} recording
 */

Daydream.prototype.parse = function (recording) {
  var newLine = '\n';
  if (os == 'windows') newLine = '\r\n';

  var result = [
    "var Nightmare = require('nightmare');",
    fmt("  new Nightmare()%s", newLine)
  ].join(newLine);

  each(recording, function (record, i) {
    var type = record[0];
    var content = record[1];
    switch (type) {
      case 'goto':
        result += fmt("    .goto('%s')%s", content, newLine);
        break;
      case 'click':
        result += fmt("    .click('%s')%s", content, newLine);
        break;
      case 'type':
        var val = record[2];
        result += fmt("    .type('%s', '%s')%s", content, val, newLine);
        break;
      case 'screenshot':
        result += fmt("    .screenshot('%s')%s", content, newLine);
        break;
      case 'reload':
        result += fmt("    .refresh()%s", newLine);
        break;
      case 'evaluate':
        var textEl = fmt("      return document.querySelector('%s').innerText;", content);

        result += [
          '    .evaluate(function () {',
          textEl,
          '    }, function (text) {',
          '      console.log(text);',
          fmt('    })%s', newLine)
        ].join(newLine);

        break;
      default:
        console.log("Not a valid nightmare command");
    }
  });

  result += "    .run();"

  return result;
};
