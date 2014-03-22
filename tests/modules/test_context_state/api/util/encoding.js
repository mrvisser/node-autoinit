
var _val = null;

module.exports.init = function(ctx, callback) {
    _val = ctx.get('mykey');
    return callback();
};

module.exports.test = function() {
    return _val;
};
