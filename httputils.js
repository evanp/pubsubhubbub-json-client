// Utilities for HTTP client calls
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

var http = require('http'),
    qs = require('querystring'),
    url = require('url');

var httputils = {

    get: function(targetUrl, callback) {

        var parts = url.parse(targetUrl);

        var options = {
            host: parts.hostname,
            port: parts.port,
            path: (parts.search) ? parts.pathname+'?'+parts.search : parts.pathname,
            method: 'GET',
            headers: {'user-agent': 'crapi-example/0.1.0dev'}
        };

        var creq = http.request(options, function(res) {

            var body = '';

            res.on('data', function (chunk) {
                body = body + chunk;
            });

            res.on('end', function () {
                res.body = body;
                callback(null, res);
            });
        });

        creq.on('error', function(err) {
            callback(err, null);
        });

        creq.end();
    },

    post: function(targetUrl, params, callback) {

        var parts = url.parse(targetUrl);

        var options = {
            host: parts.hostname,
            port: parts.port,
            path: (parts.search) ? parts.pathname+'?'+parts.search : parts.pathname,
            method: 'POST',
            headers: {'content-type': 'application/x-www-form-urlencoded',
                      'user-agent': 'crapi-example/0.1.0dev'}
        };

        var creq = http.request(options, function(res) {

            var body = '';

            res.on('data', function (chunk) {
                body = body + chunk;
            });

            res.on('end', function () {
                res.body = body;
                callback(null, res);
            });
        });

        creq.on('error', function(err) {
            callback(err, null);
        });

        creq.write(qs.stringify(params));
        creq.end();
    },

    head: function(targetUrl, callback) {

        var parts = url.parse(targetUrl);

        var options = {
            host: parts.hostname,
            port: parts.port,
            path: (parts.search) ? parts.pathname+'?'+parts.search : parts.pathname,
            method: 'HEAD',
            headers: {'user-agent': 'crapi-example/0.1.0dev'}
        };

        var creq = http.request(options, function(res) {
            callback(null, res);
        });

        creq.on('error', function(err) {
            callback(err, null);
        });

        creq.end();
    },

    "delete": function(targetUrl, callback) {

        var parts = url.parse(targetUrl);

        var options = {
            host: parts.hostname,
            port: parts.port,
            path: (parts.search) ? parts.pathname+'?'+parts.search : parts.pathname,
            method: 'DELETE',
            headers: {'user-agent': 'crapi-example/0.1.0dev'}
        };

        var creq = http.request(options, function(res) {
            callback(null, res);
        });

        creq.on('error', function(err) {
            callback(err, null);
        });

        creq.end();
    }
};

exports.httputils = httputils;
