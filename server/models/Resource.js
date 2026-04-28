const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true, enum: ['Medical', 'Rescue', 'Food', 'Shelter'] },
    status: { type: String, default: 'Available', enum: ['Available', 'Busy', 'Offline'] },
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    skillLevel: { type: Number, default: 10 } // 1-10
});

module.exports = mongoose.model('Resource', resourceSchema);
