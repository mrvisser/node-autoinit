var _ctx = null;

module.exports.init = function(ctx, callback) {
    _ctx = ctx;
    ctx.init.push('c');
    return callback();
};

module.exports.destroy = function(callback) {
    _ctx.destroy.push('c');
    return callback();
};
