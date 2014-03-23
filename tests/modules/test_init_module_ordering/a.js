module.exports.init = function(ctx, callback) {
    ctx.order.push('a.js');
    return callback();
};