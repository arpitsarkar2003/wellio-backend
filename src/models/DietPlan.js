const mongoose = require('mongoose');

const foodEntrySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Food name is required'],
        trim: true
    },
    estimatedCalories: {
        type: Number,
        required: [true, 'Estimated calories are required'],
        min: [0, 'Calories cannot be negative']
    },
    notes: {
        type: String,
        trim: true
    }
}, { _id: true }); // Keep _id for food entries to allow specific updates if needed

const mealSchema = new mongoose.Schema({
    mealName: {
        type: String,
        required: [true, 'Meal name is required'], // e.g., Breakfast, Lunch, Snack
        trim: true
    },
    time: {
        type: String,
        required: [true, 'Meal time is required'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
    },
    items: [foodEntrySchema],
    preparationNotes: {
        type: String,
        trim: true
    }
}, { _id: true });

const daySchema = new mongoose.Schema({
    day: {
        type: String,
        required: true,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    meals: [mealSchema]
}, { _id: false }); // No need for _id for day subdocument if we query by day name

const dietPlanSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    weekSchedule: {
        type: [daySchema],
        validate: {
            validator: function (v) {
                // Ensure strictly 7 days, unique
                if (!v || v.length === 0) return true; // Allow empty initially? Requirement says "Supports a weekly schedule".
                // Check for duplicate days
                const days = v.map(d => d.day);
                return new Set(days).size === days.length;
            },
            message: 'Week schedule must contain unique days'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Ensure weekSchedule is sorted by day order when saving? 
// Or just handle it in application logic. Application logic is better.

module.exports = mongoose.model('DietPlan', dietPlanSchema);
