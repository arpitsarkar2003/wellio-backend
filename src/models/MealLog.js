const mongoose = require('mongoose');

const mealLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dietPlan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DietPlan',
        required: true
    },
    mealSlotId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    date: {
        type: String,
        required: true,
        match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
    },
    scheduledTimeSnapshot: {
        type: String,
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
    },
    status: {
        type: String,
        required: true,
        enum: ['completed', 'skipped', 'not_yet'],
        default: 'not_yet'
    },
    actualCalories: {
        type: Number,
        min: [0, 'Calories cannot be negative']
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    }
}, {
    timestamps: true
});

// Ensure only one log per user + meal slot + date
mealLogSchema.index({ user: 1, mealSlotId: 1, date: 1 }, { unique: true });

// Validation: 'completed' status requires actualCalories
mealLogSchema.pre('save', function(next) {
    if (this.status === 'completed' && this.actualCalories === undefined) {
        return next(new Error('Actual calories are required when status is completed'));
    }
    next();
});

// Validation for future dates (handled in controller usually, but can be added here too)
// However, business logic like "future dates cannot be logged" is often better in the controller
// to allow for easier testing and specific error messages, but a custom validator works too.

module.exports = mongoose.model('MealLog', mealLogSchema);
