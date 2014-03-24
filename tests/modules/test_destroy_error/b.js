
module.exports.destroy = function(callback) {
    return callback(new Error('test_destroy_error'));
};
