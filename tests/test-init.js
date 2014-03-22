
var _ = require('underscore');
var autoinit = require('../index');
var assert = require('assert');
var path = require('path');

describe('Autoinit', function() {
    
    it('returns empty module for empty directory', function(callback) {
        autoinit.init(_testDir('test_init_empty'), function(err, module) {
            assert.ifError(err);
            assert.ok(!_.isArray(module));
            assert.ok(_.isObject(module));
            assert.ok(_.isEmpty(module));
            return callback();
        });
    });

    it('loads a js file that had no init method', function(callback) {
        autoinit.init(_testDir('test_init_noinit'), function(err, module) {
            assert.ifError(err);
            assert.ok(module.testmodule);
            assert.strictEqual(module.testmodule.test(), 'test_init_noinit');
            return callback();
        });
    });

    it('loads a js file that has an init method', function(callback) {
        autoinit.init(_testDir('test_init'), function(err, module) {
            assert.ifError(err);
            assert.ok(module.testmodule);
            assert.strictEqual(module.testmodule.test(), 'inited');
            return callback();
        });
    });

    it('loads a module hierarchy from folders', function(callback) {
        autoinit.init(_testDir('test_init_dirs'), function(err, module) {
            assert.ifError(err);
            assert.ok(module);
            assert.ok(module.dir_a);
            assert.ok(module.dir_b);
            assert.ok(module.dir_c);
            assert.strictEqual(module.dir_b.testmodule.test(), 'test_init_dirs_dir_b');
            return callback();
        });
    });

    it('can load an overlapping js and directory module', function(callback) {
        autoinit.init(_testDir('test_js_dir_overlap'), function(err, module) {
            assert.ifError(err);
            assert.ok(module.testmodule);
            assert.ok(module.testmodule.testsubmodule);
            assert.strictEqual(module.testmodule.test(), 'test_js_dir_overlap_module');
            assert.strictEqual(module.testmodule.testsubmodule.test(), 'test_js_dir_overlap_submodule');
            return callback();
        });
    });

    it('will throw an error when an init method throws an error', function(callback) {
        autoinit.init(_testDir('test_init_error'), function(err, module) {
            assert.strictEqual(err.message, 'test_init_error');
            assert.ok(!module);
            return callback();
        });
    });

    it('will accept a module as an init return value', function(callback) {
        autoinit.init(_testDir('test_init_return_module'), function(err, module) {
            assert.ok(!err);
            assert.ok(module.api);
            assert.ok(module.api.util);
            assert.ok(module.api.util.encoding);
            assert.strictEqual(module.api.util.encoding.test(), 'test_init_return_module');
            return callback();
        });
    });

    it('will carry a context state through initialization', function(callback) {
        autoinit.init(_testDir('util'), function(err, testutil) {
            assert.ok(!err);

            var ctx = new testutil.AutoinitContext();
            ctx.set('mykey', 'test_context_state');

            autoinit.init(_testDir('test_context_state'), ctx, function(err, module) {
                assert.ok(!err);
                assert.ok(module.api);
                assert.ok(module.api.util);
                assert.ok(module.api.util.encoding);
                assert.strictEqual(module.api.util.encoding.test(), 'test_context_state');
                return callback();
            });
        });
    });

    it('will return an error when overloading a function module', function(callback) {
        autoinit.init(_testDir('test_init_function_overload_error'), function(err, module) {
            assert.ok(err);
            assert.strictEqual(err.message.indexOf('Attempted to overload function module'), 0);
            return callback();
        });
    });

    it('will return an error when an initialization step returns an error', function(callback) {
        autoinit.init(_testDir('test_init_function_error'), function(err, module) {
            assert.ok(err);
            assert.strictEqual(err.message, 'test_init_function_error');
            return callback();
        });
    });
});

var _testDir = function(dirName) {
    return path.join(__dirname, 'modules', dirName);
};
