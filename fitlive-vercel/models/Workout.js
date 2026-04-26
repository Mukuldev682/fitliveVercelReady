const mongoose = require('mongoose');

const WorkoutSchema = new mongoose.Schema({
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exerciseName:   { type: String, required: true, trim: true },
  type:           { type: String, enum: ['Cardio', 'Strength', 'Flexibility', 'HIIT', 'Sports', 'Other'], default: 'Cardio' },
  duration:       { type: Number, required: true, min: 1 },
  caloriesBurned: { type: Number, default: 0 },
  intensity:      { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  notes:          { type: String, trim: true },
  date:           { type: Date, default: Date.now }
});

module.exports = mongoose.model('Workout', WorkoutSchema);
