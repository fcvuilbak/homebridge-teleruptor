var Service, Characteristic;
var rpio = require('rpio');

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-teleruptor", "Teleruptor", TeleruptorAccessory);
}

function TeleruptorAccessory(log, config) {
  this.log = log;
  this.name = config["name"];
  this.pin = config["pin"];
  this.invert = defaultVal(config["invert"], false);
  this.default = defaultVal(config["default_state"], false);
  this.duration = defaultVal(config["duration_ms"], 0);
  this.timerid = -1;

  if (!this.pin) throw new Error("You must provide a config value for 'pin'.");
  if (!is_int(this.pin)) throw new Error("You must provide an integer config value for 'pin'.");
  if (!is_int(this.duration)) throw new Error("The config value 'duration' must be an integer number of milliseconds.");

  this.log("Creating a teleruptor named '%s', initial state: %s", this.name, (this.default? "ON" : "OFF"));
  rpio.open(this.pin, rpio.OUTPUT, this.gpioVal(this.default));
}

TeleruptorAccessory.prototype.getTeleruptorStatus = function(callback) {
  callback(null, this.readState());
}

TeleruptorAccessory.prototype.setTeleruptorOn = function(newState, callback) {
  if (this.timerid !== -1) {
    clearTimeout(this.timerid);
    this.timerid = -1;
  }

  this.setState(newState);
  this.log("Teleruptor status for '%s', pin %d is %s", this.name, this.pin, newState);

  if (newState && this.duration > 0) {
    this.timerid = setTimeout(this.timeOutCB, this.duration, this);
  }

  callback(null);
}

TeleruptorAccessory.prototype.timeOutCB = function(o) {
  o.setState(false);
  o.log("Relay for '%s', pin %d timed out.", o.name, o.pin);
  o.timerid = -1;
}

TeleruptorAccessory.prototype.readState = function() {
  var val = this.gpioVal(rpio.read(this.pin) > 0);
  return val == rpio.HIGH;
}

TeleruptorAccessory.prototype.setState = function(val) {
  rpio.write(this.pin, this.gpioVal(val));
}

TeleruptorAccessory.prototype.gpioVal = function(val) {
  if (this.invert) val = !val;
  return val? rpio.HIGH : rpio.LOW;
}

TeleruptorAccessory.prototype.getServices = function() {
  var teleruptorService = new Service.Switch(this.name);
  teleruptorService.getCharacteristic(Characteristic.On)
    .on('get', this.getTeleruptorStatus.bind(this))
    .on('set', this.setTeleruptorOn.bind(this));
  return [teleruptorService];
}

var is_int = function(n) {
  return n % 1 === 0;
}

var is_defined = function(v) {
  return typeof v !== 'undefined';
}

var defaultVal = function(v, dflt) {
  return is_defined(v)? v : dflt;
}

