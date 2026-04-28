const mongoose = require('mongoose');

const sosSchema = new mongoose.Schema({
    caseId: { type: String, required: true, unique: true },
    type: { type: String, required: true, enum: ['Medical', 'Rescue', 'Food', 'Shelter'] },
    urgency: { type: String, required: true, enum: ['Critical', 'High', 'Medium'] },
    status: { type: String, default: 'Pending', enum: ['Pending', 'Assigned', 'Resolved'] },
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        address: { type: String, required: true }
    },
    assignedResource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SOS', sosSchema);
