module.exports.init = function(ctx, callback) {
    ctx.order.push('cc');
    return callback();
};