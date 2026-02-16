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
}, { _id: true });

const mealSchema = new mongoose.Schema({
    mealName: {
        type: String,
        required: [true, 'Meal name is required'],
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
}, { _id: false });

const dietTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Template name is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    goal: {
        type: String,
        enum: ['weight_loss', 'muscle_gain', 'balanced', 'keto', 'vegan'],
        required: [true, 'Goal is required']
    },
    weekSchedule: {
        type: [daySchema],
        validate: {
            validator: function (v) {
                if (!v || v.length === 0) return false;
                const days = v.map(d => d.day);
                return new Set(days).size === 7; // Must include exactly 7 days
            },
            message: 'Week schedule must contain exactly 7 unique days'
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SuperAdmin', // Assuming templates are created by SuperAdmin
        required: true
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('DietTemplate', dietTemplateSchema);
