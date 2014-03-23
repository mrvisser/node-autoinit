
var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var util = require('util');

// Always globally ignore internal files and node_modules
var IGNORE_BASE_REGEXP = '^(\\.|~|node_modules)';

var init = module.exports.init = function(/* (rootDirPath | options), [callback] */) {

    var options = (_.isString(arguments[0])) ? {'root': arguments[0]} : arguments[0];

    // Validate the arguments
    if (!_.isObject(options) || !_.isString(options.root)) {
        throw new Error('First argument to Autoinit must either be a string (root directory path) or an object containing at least the "root" property');
    }

    var rootDirPath = options.root;
    var ctx = options.ctx;
    var callback = arguments[1] || function(){};

    return _initDir(options, options.root, callback);
};

var _initDir = function(options, dirPath, callback) {
    _readModules(dirPath, function(err, meta, moduleInfos) {
        if (err) {
            return callback(err);
        }

        meta = meta || {};

        moduleInfos = _filterModules(options, meta, moduleInfos);
        moduleInfos = _orderModules(options, meta, moduleInfos);

        return _initModuleInfos(options, moduleInfos, callback);
    });
};

var _initModuleInfos = function(options, moduleInfos, callback, _module) {
    _module = _module || {};
    if (_.isEmpty(moduleInfos)) {
        return callback(null, _module);
    }

    var moduleInfo = moduleInfos.shift();

    if (_.isFunction(_module[moduleInfo.name])) {
        // Verify we never try and overload a function module (e.g., a model object)
        return callback(new Error(util.format('Attempted to overload function module "%s"', moduleInfo.path)));
    } else if (moduleInfo.type === 'directory') {
        // For a directory, we recursively load everything inside of it as
        // the module
        _initDir(options, moduleInfo.path, function(err, module) {
            if (err) {
                return callback(err);
            }

            // Seed the module object
            _module[moduleInfo.name] = _module[moduleInfo.name] || {};
            _.extend(_module[moduleInfo.name], module);
            return _initModuleInfos(options, moduleInfos, callback, _module);
        });
    } else if (moduleInfo.type === 'js') {
        var jsPackage = require(moduleInfo.path);

        // When the package is a function, we simply assign it directly to the module if it is safe to do so
        if (_.isFunction(jsPackage)) {
            if (_module[moduleInfo.name]) {
                // Verify we never try and overload a function module (e.g., a model object)
                return callback(new Error(util.format('Attempted to overload function module "%s" with an existing module', moduleInfo.path)));
            }

            _module[moduleInfo.name] = jsPackage;
            return _initModuleInfos(options, moduleInfos, callback, _module);
        }

        // Since we're dealing with an object, we'll seed it as one and overload the existing one if applicable
        _module[moduleInfo.name] = _module[moduleInfo.name] || {};

        // If there is no init method, we simply return with the package itself as the module
        if (!_.isFunction(jsPackage.init)) {
            _.extend(_module[moduleInfo.name], jsPackage);
            return _initModuleInfos(options, moduleInfos, callback, _module);
        }

        // If the node module does have an init method, we invoke it with (optionally) the ctx if intended to be invoked with one
        jsPackage.init.apply(jsPackage, _.compact([options.ctx, function(err, module) {
            if (err) {
                return callback(err);
            }

            // The init method can provide the module to use. If it doesn't, we use the jsPackage object itself
            _.extend(_module[moduleInfo.name], module || jsPackage);
            return _initModuleInfos(options, moduleInfos, callback, _module);
        }]));
    }
};

var _readModules = function(rootDirPath, callback) {
    var meta = null;
    try {
        meta = require(_metaPath(rootDirPath));
    } catch (ex) {}

    fs.readdir(rootDirPath, function(err, fileNames) {
        if (err) {
            return callback(err);
        }

        _categorizeFileNames(rootDirPath, fileNames, function(err, dirNames, jsFileNames) {
            if (err) {
                return callback(err);
            }

            return callback(null, meta, _.union(
                _.map(dirNames, function(dirName) {
                    return {
                        'type': 'directory',
                        'name': dirName,
                        'path': path.join(rootDirPath, dirName)
                    };
                }),
                _.map(jsFileNames, function(jsFileName) {
                    return {
                        'type': 'js',
                        'name': jsFileName.split('.').slice(0, -1).join('.'),
                        'path': path.join(rootDirPath, jsFileName)
                    };
                })
            ));
        });
    });
};

var _categorizeFileNames = function(rootDirPath, fileNames, callback, _dirNames, _jsFileNames) {
    _dirNames = _dirNames || [];
    _jsFileNames = _jsFileNames || [];
    if (_.isEmpty(fileNames)) {
        return callback(null, _dirNames, _jsFileNames);
    }

    var fileName = fileNames.pop();
    var filePath = path.join(rootDirPath, fileName);
    fs.stat(filePath, function(err, stat) {
        if (err) {
            return callback(err);
        } else if (stat.isDirectory()) {
            _dirNames.push(fileName);
        } else if (stat.isFile() && fileName.split('.').pop() === 'js') {
            _jsFileNames.push(fileName);
        }

        return _categorizeFileNames(rootDirPath, fileNames, callback, _dirNames, _jsFileNames);
    });
};

var _filterModules = function(options, meta, moduleInfos) {
    var globalIgnoreRegexp = _createIgnoreRegexp(IGNORE_BASE_REGEXP);
    var optionsIgnoreRegexp = _createIgnoreRegexp(options.ignore);
    var autoinitIgnoreRegexp = _createIgnoreRegexp(meta.ignore);
    return _.filter(moduleInfos, function(moduleInfo) {
        return (!globalIgnoreRegexp.test(moduleInfo.name) && !optionsIgnoreRegexp.test(moduleInfo.name) && !autoinitIgnoreRegexp.test(moduleInfo.name));
    });
};

var _orderModules = function(options, meta, moduleInfos) {
    return _.chain(moduleInfos)
        .sortBy(function(moduleInfo) {
            // Tertiary ordering ensures that directories are initialized after js files
            return (moduleInfo.type === 'directory') ? 1 : 0;
        })
        .sortBy('name')
        .sortBy(function(moduleInfo) {
            // Primary ordering is those that are specified in the autoinit.js ordering. If
            // a module is not specified, they are ordered alphabetically after the group of
            // explicitly ordered modules
            var index = _.indexOf(meta.order, moduleInfo.name);
            return (index === -1) ? Number.MAX_VALUE : index;
        })
        .value();
};

var _createIgnoreRegexp = function(str) {
    return (_.isString(str)) ? new RegExp(str) : new RegExp('^$');
};

var _metaPath = function(rootDirPath) {
    return path.join(rootDirPath, 'autoinit.json');
};
