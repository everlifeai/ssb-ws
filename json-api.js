'use strict'
var ref = require('ssb-ref')
var Stack = require('stack')
var BlobsHttp = require('multiblob-http')
var pull = require('pull-stream')
var URL = require('url')
var Emoji = require('emoji-server')

function msgHandler(path, handler) {
  return function (req, res, next) {
    console.log(req.method, req.url)
    if(req.method !== 'GET') return next()
    if(req.url.indexOf(path) === 0) {
      var id = req.url.substring(path.length)
      if(!ref.isMsg(id))
        next(new Error('not a valid message id:'+id))
      else {
        req.id = id
        handler(req, res, next)
      }
    }
    else
      next()
  }
}

function send(res, obj) {
  res.writeHead(200, {'Content-Type': 'application/json'})
  res.end(JSON.stringify(obj, null, 2))
}

module.exports = function (sbot, layers) {
  var prefix = '/blobs'
  return Stack(
    function (req, res, next) {
      Stack.compose.apply(null, layers)(req, res, next)
    },
    Emoji('/img/emoji'),
    //blobs are served over CORS, so you can get blobs from any pub.
    function (req, res, next) {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader("Access-Control-Allow-Headers",
      "Authorization, Content-Type, If-Match, If-Modified-Since, If-None-Match, If-Unmodified-Since");
      res.setHeader("Access-Control-Allow-Methods", "GET", "HEAD");
      next()
    },
    function (req, res, next) {
      if(!(req.method === "GET" || req.method == 'HEAD')) return next()

      var u = URL.parse('http://makeurlparseright.com'+req.url)
      var hash = decodeURIComponent(u.pathname.substring((prefix+'/get/').length))
      //check if we don't already have this, tell blobs we want it, if necessary.
      sbot.blobs.has(hash, function (err, has) {
        if(has) next()
        else sbot.blobs.want(hash, function (err, has) { next() })
      })
    },
    BlobsHttp(sbot.blobs, prefix)
  )
}





