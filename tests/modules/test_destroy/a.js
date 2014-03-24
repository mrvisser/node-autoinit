var _ctx = null;

module.exports.init = function(ctx, callback) {
    _ctx = ctx;
    _ctx.init.push('a');
    return callback();
};

module.exports.destroy = function(callback) {
    _ctx.destroy.push('a');
    return callback();
};
