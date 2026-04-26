const mongoose = require('mongoose');

const DietSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mealName: { type: String, required: true, trim: true },
  category: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'], default: 'Breakfast' },
  calories: { type: Number, required: true, min: 0 },
  protein:  { type: Number, default: 0 },
  carbs:    { type: Number, default: 0 },
  fats:     { type: Number, default: 0 },
  date:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('Diet', DietSchema);
