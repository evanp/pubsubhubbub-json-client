// main function for activity spam checker
//
// Copyright 2011, 2012 StatusNet Inc.
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
    _ = require('underscore'),
    config = require('./config');

var requests = {};
var subscriptions = {};

var subCallback = function(req, res) {

    var contentType = req.headers['Content-Type'];

    // Verify

    if (contentType === 'application/x-www-form-urlencoded') {

	var params = req.body;
	var verify_token = params['hub.verify_token'];

	if (!_(requests).has(verify_token)) {

	    res.writeHead(404, {'Content-Type': 'text/plain'});
	    res.end('Not allowed');

	} else if (params['hub.mode'] === requests[verify_token].mode &&
	    params['hub.topic'] === requests[verify_token].topic) {

	    res.writeHead(200, {'Content-Type': 'text/plain'});
	    res.end(params['hub.challenge']);

	} else {

	    res.writeHead(404, {'Content-Type': 'text/plain'});
	    res.end('Not allowed');
	}

    } else if (contentType === 'application/json') { // Content

	var updates = req.body;

	if (!_(updates).isArray()) {

	} else {
	}

    } else {

	res.writeHead(400, {'Content-Type': 'text/plain'});
	res.end('Suck it.');

    }
};

var server = connect.createServer(
    connect.logger(),
    connect.bodyParser(),
    connect.errorHandler({showMessage: true}),
    connect.basicAuth(config.username, config.password),
    connect.router(function(app) {
        app.post('/callback', subCallback);
    })
);

server.listen(80);
