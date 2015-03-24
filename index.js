var $ = require('cheerio');
var request = require('request');
var async = require('async');
var parallelDownload = require('../parallel-download');
var path = require('path');
var ProgressBar = require('progress');
var URL = require('url');

var links = [];

function anchorListToUrlList (anchorList) {
  return [].slice.call(anchorList).map(function (anchor) {
    return $(anchor).attr('href');
  });
}

function countUpperRelatives (path) {
  var matches = path.match(/\.\.\//g);
  return matches ? matches.length : 0;
}

function isHttpUrl (url) {
  return /^http\s:\/\//.test(url.trim());
}

function goUpperRelativePath (baseUrl, url) {
  if (isHttpUrl(url)) {
    console.log('Complete URL:', url);
    return url;
  }

  console.log('Formatting relative URL:', url);

  var times = countUpperRelatives(url);
  var i = -1;
  var result = baseUrl.trim();

  while (++i < times) {
    result = result.replace(/\/\w+\/?$/, '');
  }

  var destUrl = url.replace(/\.\.\//g, '').trim();

  return result.trim() + (destUrl.charAt(0) === '/' ? destUrl : ('/' + destUrl));
}

function imageDownloader (options) {
  request(options.pageUrl, function (err, res, body) {
    if (err || res.statusCode !== 200) {
      throw err;
    }

    var page = $(body);
    var anchors = page.find('a');
    var anchorsUrls = anchorListToUrlList(anchors);

    var imageUrls = anchorsUrls
      .filter(function (url) {
        return (url || '').match(/\.jp(e?)g$/);
      })
      .map(function (imageUrl) {
        return URL.resolve(options.pageUrl, imageUrl);
      });

    var downloadBar = new ProgressBar('Downloading images [:bar] :percent :etas', {
      total: imageUrls.length
    });

    var filesBar = new ProgressBar('Writing files [:bar] :percent', {
      total: imageUrls.length
    });

    parallelDownload({
      urls: imageUrls,
      encoding: 'binary',
      dest: options.folderName === '' ? __dirname : path.join(__dirname, options.folderName),
      eachCallback: function () {
        downloadBar.tick();
      },
      writeCallback: function () {
        filesBar.tick();
      },
      callback: function (err) {
        if (err) {
          console.log(err);
        }
      }
    });
  });
}

module.exports = imageDownloader;
