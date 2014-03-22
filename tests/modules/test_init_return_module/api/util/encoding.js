module.exports.init = function(callback) {
    return callback(null, {
        'test': function() {
            return 'test_init_return_module';
        }
    });
};
