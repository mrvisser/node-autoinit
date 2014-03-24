var _ctx = null;

module.exports.init = function(ctx, callback) {
    _ctx = ctx;
    return callback();
};
