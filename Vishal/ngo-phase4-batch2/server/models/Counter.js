const { Schema, model } = require('mongoose');

// Atomic sequence numbers (receipt numbers). One document per sequence name.
const Counter = model('Counter', new Schema({ _id: String, seq: { type: Number, default: 0 } }));

Counter.next = async (name) => (await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true, upsert: true })).seq;

module.exports = Counter;
