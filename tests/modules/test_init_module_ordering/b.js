module.exports.init = function(ctx, callback) {
    ctx.order.push('b.js');
    return callback();
};