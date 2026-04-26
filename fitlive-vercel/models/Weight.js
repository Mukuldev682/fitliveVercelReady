const mongoose = require('mongoose');

const WeightSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  value:  { type: Number, required: true, min: 1 },
  note:   { type: String, trim: true },
  source: { type: String, enum: ['manual', 'google_fit'], default: 'manual' },
  date:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Weight', WeightSchema);
