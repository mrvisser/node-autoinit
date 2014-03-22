var AutoinitContext = module.exports = function() {
    this._props = {};
};

AutoinitContext.prototype.set = function(key, val) {
    this._props[key] = val;
};

AutoinitContext.prototype.get = function(key) {
    return this._props[key];
};
