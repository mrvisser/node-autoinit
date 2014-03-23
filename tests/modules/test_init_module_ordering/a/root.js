module.exports.init = function(ctx, callback) {
    ctx.order.push('a');
    return callback();
};