module.exports.init = function(ctx, callback) {
    ctx.order.push('cb.js');
    return callback();
};