
var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var util = require('util');

var init = module.exports.init = function(/* rootDirPath, [ctx], [callback] */) {
    if (!_.isString(arguments[0])) {
        throw new Error('First argument to Autoinit must be a string (root directory)');
    }

    var rootDirPath = arguments[0];
    var ctx = null;
    var callback = function(){};

    if (_.isFunction(arguments[1])) {
        callback = arguments[1];
    } else if (_.isObject(arguments[1])) {
        ctx = arguments[1];
    }

    if (_.isFunction(arguments[2])) {
        callback = arguments[2];
    }

    return _initDir(rootDirPath, ctx, function(err, module) {
        return callback(err, module);
    });
};

var _initDir = function(rootDirPath, ctx, callback) {
    _readModules(rootDirPath, function(err, meta, moduleInfos) {
        if (err) {
            return callback(err);
        }

        return _initModuleInfos(ctx, moduleInfos, callback);
    });
};

var _initModuleInfos = function(ctx, moduleInfos, callback, _module) {
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
        _initDir(moduleInfo.path, ctx, function(err, module) {
            if (err) {
                return callback(err);
            }

            // Seed the module object
            _module[moduleInfo.name] = _module[moduleInfo.name] || {};
            _.extend(_module[moduleInfo.name], module);
            return _initModuleInfos(ctx, moduleInfos, callback, _module);
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
            return _initModuleInfos(ctx, moduleInfos, callback, _module);
        }

        // Since we're dealing with an object, we'll seed it as one and overload the existing one if applicable
        _module[moduleInfo.name] = _module[moduleInfo.name] || {};

        // If there is no init method, we simply return with the package itself as the module
        if (!_.isFunction(jsPackage.init)) {
            _.extend(_module[moduleInfo.name], jsPackage);
            return _initModuleInfos(ctx, moduleInfos, callback, _module);
        }

        // If the node module does have an init method, we invoke it with (optionally) the ctx if intended to be invoked with one
        jsPackage.init.apply(jsPackage, _.compact([ctx, function(err, module) {
            if (err) {
                return callback(err);
            }

            // The init method can provide the module to use. If it doesn't, we use the jsPackage object itself
            _.extend(_module[moduleInfo.name], module || jsPackage);
            return _initModuleInfos(ctx, moduleInfos, callback, _module);
        }]));
    }
};

var _readModules = function(rootDirPath, callback) {
    var meta = null;
    fs.exists(_metaPath(rootDirPath), function(err, exists) {
        if (err) {
            return callback(err);
        } else if (exists) {
            meta = require(_metaPath(rootDirPath));
        }

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
    });
};

var _categorizeFileNames = function(rootDirPath, fileNames, callback, _dirNames, _jsFileNames) {
    _dirNames = _dirNames || [];
    _jsFileNames = _jsFileNames || [];
    if (_.isEmpty(fileNames)) {
        return callback(null, _dirNames.sort(), _jsFileNames.sort());
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

var _metaPath = function(rootDirPath) {
    return path.join(rootDirPath, 'autoinit.json');
};
