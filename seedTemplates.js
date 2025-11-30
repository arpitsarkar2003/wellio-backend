const mongoose = require('mongoose');
const DietTemplate = require('./src/models/DietTemplate');
const SuperAdmin = require('./src/models/SuperAdmin');
require('dotenv').config();

const templates = [
    {
        name: 'Weight Loss Plan',
        description: 'A 1200-1500 kcal plan focused on weight loss with balanced macros.',
        goal: 'weight_loss',
        weekSchedule: Array(7).fill(null).map((_, i) => ({
            day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i],
            meals: [
                {
                    mealName: 'Breakfast',
                    time: '08:00',
                    items: [{ name: 'Oatmeal with Berries', estimatedCalories: 300, notes: 'Use water or almond milk' }]
                },
                {
                    mealName: 'Lunch',
                    time: '13:00',
                    items: [{ name: 'Grilled Chicken Salad', estimatedCalories: 450, notes: 'Light dressing' }]
                },
                {
                    mealName: 'Dinner',
                    time: '19:00',
                    items: [{ name: 'Baked Salmon with Veggies', estimatedCalories: 500, notes: 'Steamed broccoli' }]
                }
            ]
        })),
        isDefault: true
    },
    {
        name: 'Muscle Gain Plan',
        description: 'High protein plan for muscle building.',
        goal: 'muscle_gain',
        weekSchedule: Array(7).fill(null).map((_, i) => ({
            day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i],
            meals: [
                {
                    mealName: 'Breakfast',
                    time: '07:30',
                    items: [{ name: 'Scrambled Eggs (4) & Toast', estimatedCalories: 500 }]
                },
                {
                    mealName: 'Lunch',
                    time: '12:30',
                    items: [{ name: 'Chicken Breast & Rice', estimatedCalories: 700 }]
                },
                {
                    mealName: 'Pre-Workout Snack',
                    time: '16:00',
                    items: [{ name: 'Protein Shake', estimatedCalories: 200 }]
                },
                {
                    mealName: 'Dinner',
                    time: '20:00',
                    items: [{ name: 'Steak & Sweet Potato', estimatedCalories: 800 }]
                }
            ]
        })),
        isDefault: true
    },
    {
        name: 'Balanced Diet',
        description: 'Moderate calorie plan for maintenance.',
        goal: 'balanced',
        weekSchedule: Array(7).fill(null).map((_, i) => ({
            day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i],
            meals: [
                {
                    mealName: 'Breakfast',
                    time: '08:00',
                    items: [{ name: 'Avocado Toast', estimatedCalories: 400 }]
                },
                {
                    mealName: 'Lunch',
                    time: '13:00',
                    items: [{ name: 'Turkey Sandwich', estimatedCalories: 500 }]
                },
                {
                    mealName: 'Dinner',
                    time: '19:00',
                    items: [{ name: 'Pasta Primavera', estimatedCalories: 600 }]
                }
            ]
        })),
        isDefault: true
    }
];

const seedTemplates = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI_DEV || process.env.MONGODB_URI;
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB');

        // Find a super admin to assign as creator
        const admin = await SuperAdmin.findOne();
        if (!admin) {
            console.error('No SuperAdmin found. Please run setup.js first to create an admin.');
            process.exit(1);
        }

        for (const tmpl of templates) {
            const exists = await DietTemplate.findOne({ name: tmpl.name });
            if (!exists) {
                await DietTemplate.create({ ...tmpl, createdBy: admin._id });
                console.log(`Created template: ${tmpl.name}`);
            } else {
                console.log(`Template already exists: ${tmpl.name}`);
            }
        }

        console.log('Template seeding completed.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedTemplates();
