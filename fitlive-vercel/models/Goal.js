const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:        { type: String, required: true, trim: true },
  category:     { type: String, enum: ['Weight Loss', 'Weight Gain', 'Calorie Target', 'Workout Frequency', 'Step Count', 'Custom'], default: 'Custom' },
  currentValue: { type: Number, required: true },
  targetValue:  { type: Number, required: true },
  unit:         { type: String, trim: true, default: '' },
  deadline:     { type: Date },
  achieved:     { type: Boolean, default: false },
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('Goal', GoalSchema);
