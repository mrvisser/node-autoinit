module.exports.init = function(ctx, callback) {
    ctx.order.push('b');
    return callback();
};