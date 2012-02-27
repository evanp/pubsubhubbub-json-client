// A test client for pubsubhubbub-json
//
// Copyright 2012 StatusNet Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var connect = require('connect'),
    bodyParser = connect.bodyParser,
    _ = require('underscore'),
    config = require('./config'),
    httputils = require('./httputils').httputils,
    crypto = require('crypto');

var requests = {};
var subscriptions = {};

// Snagged from connect.bodyParser; grab the raw body so we can check the sig

var parseJSON = function(req, fn) {
    var buf = '';
    req.setEncoding('utf8');
    req.on('data', function(chunk) { 
        buf += chunk; 
    });
    req.on('end', function(){
        req.rawBody = buf;
        try {
            req.body = buf.length
                ? JSON.parse(buf)
                : {};
            fn();
        } catch (err) {
            fn(err);
        }
    });
};

var hmacSig = function(message, secret) {
    var hmac = crypto.createHmac('sha1', secret);
    hmac.update(message);
    return hmac.digest("hex");
};

var deliverPayload = function(payload) {
    // NOOP
};

var verifySubscription = function(req, res) {

    var parse = bodyParser.parse['application/x-www-form-urlencoded'],
        showError = function(message) {
	    res.writeHead(404, {'Content-Type': 'text/plain'});
	    res.end('Suck it loser');
        };

    parse(req, {}, function(err) {

	var params = req.body;
	var verify_token = params['hub.verify_token'];

	if (!_(requests).has(verify_token)) {

            showError();

	} else if (params['hub.mode'] === requests[verify_token].mode &&
	           params['hub.topic'] === requests[verify_token].topic) {

	    res.writeHead(200, {'Content-Type': 'text/plain'});
	    res.end(params['hub.challenge']);

	} else {
            showError();
	}
    });
};

var receiveContent = function(req, res) {

    var showError = function(message) {
	res.writeHead(404, {'Content-Type': 'text/plain'});
	res.end('Suck it loser');
    };

    parseJSON(req, function(err) {

        var i, notice, topic, sub, sig;

        if (err) {
            showError();
            return;
        }

        if (!_.(req.body).has('items') || 
            !_(req.body.items).isArray() || 
            req.body.items.length === 0)
        {
            showError();
            return;
        }

        topic = req.body.items[0].topic;

        for (i = 1; i < req.body.items.length; i++) {
            if (req.body.items[i].topic !== topic) {
                showError();
                return;
            }
        }

        sub = subscriptions[topic];

        if (!sub) {
            showError();
            return;
        }

        sig = req.headers['x-hub-signature'];

        if (!sig || sig !== hmacSig(req.rawBody, sub.secret)) {
            showError();
            return;
        }

        // All good; let's deliver them.

        for (i = 0; i < req.body.items.length; i++) {
            deliverPayload(req.body.items[i].payload);
        }
    });
};

var subCallback = function(req, res) {

    var contentType = req.headers['content-type'];

    // Verify

    if (contentType === 'application/x-www-form-urlencoded') {

        verifySubscription(req, res);

    } else if (contentType === 'application/json') { // Content

        receiveContent(req, res);

    } else {

	res.writeHead(400, {'Content-Type': 'text/plain'});
	res.end('Suck it loser');

    }
};

var showForm = function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end("<!DOCTYPE html>\n"+
            "<html>" +
            "<head><title>PubSubHubbub JSON Example</title></head>" +
            "<body>" +
            "<h1>PubSubHubbub JSON Example</h1>" +
            "<p>"+
            "<form method='post' action='/'>"+
            "<label for='server'>Topic</label>: <input type='text' size='30' name='topic' id='topic'/>"+
            "</form>" +
            "</p>" +
            "</body>" +
            "</html>");
};


var discoverHub = function(topic, callback) {

    var theHardWay = function(topic, callback) {
        httputils.get(topic, function(err, res) {
            var doc;
            if (err) {
                callback(err, null);
            } else if (!res.headers['content-type'] === 'application/json') {
                callback(new Error("Not JSON"), null);
            } else {
                try {
                    doc = JSON.parse(res.body);
                } catch (err) {
                    callback(err, null);
                    return;
                }
                if (!doc.hubs || doc.hubs.length === 0) {
                    callback(new Error("No hubs declared in document"), null);
                    return;
                }
                callback(null, doc.hubs[0]);
            }
        });
    },
        getLinks = function(linkHeader) {

            var i, j, link, part, parts, href, hrefPart, links, ops, linkStr, linkStrs, key, value;

            linkStrs = linkHeader.split(',');

            links = [];

            for (i in linkStrs) {

                linkStr = linkStrs[i].trim();
                parts = linkStr.split(';');
                hrefPart = parts.shift();
                href = hrefPart.match(/<(.*?)>/);

                if (!href) {
                    continue;
                }

                link = {href: href[1]};

                for (j in parts) {
                    part = parts[j].trim();
                    ops = part.split("=");
                    key = ops[0].trim();
                    value = ops[1].trim();
                    value = value.replace(/^[\"\']|[\"\']$/g, '');
                    link[key] = value;
                }

                links.push(link);
            }

            return links;
        };

    httputils.head(topic, function(err, res) {
        var hubs = [], links, i;
        if (err || !res.headers['link']) {
            theHardWay(topic, callback);
            return;
        }
        links = getLinks(res.headers['link']);
        for (i in links) {
            if (links[i].rel === 'hub') {
                hubs.push(links[i].href);
            }
        }
        if (hubs.length === 0) {
            theHardWay(topic, callback);
            return;
        } else {
            callback(null, hubs[0]);
        }
    });
};

var subscribeTopic = function(topic, hub, callback) {

    var params = {'hub.callback': localUrl('callback'),
                  'hub.mode': 'subscribe',
                  
                  
};

var subscribe = function(req, res) {

    var topic = req.body.topic;

    var showError = function(message) {
        showForm(req, res);
    };

    if (!topic) {
        showError();
        return;
    }

    discoverHub(topic, function(err, hub) {

        if (err) {
            showError();
            return;
        }
        subscribeTopic(topic, hub, function(err, results) {
            res.writeHead(200, {'Content-Type': 'text/html'});
        });
    });
};

var server = connect.createServer(
    connect.logger(),
    connect.errorHandler({showMessage: true}),
    connect.router(function(app) {
        app.get('/', showForm);
        app.post('/', connect.bodyParse(), subscribe);
        app.post('/callback', subCallback);
    })
);

server.listen(80);
