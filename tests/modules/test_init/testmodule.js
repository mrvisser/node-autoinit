
var val = null;

module.exports.init = function(callback) {
    val = 'inited';
    return callback();
};

module.exports.test = function() {
    return val;
};
