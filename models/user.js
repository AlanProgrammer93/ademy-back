import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const { ObjectId } = Schema;

const userSchema = new Schema({
    name: {
        type: String,
        trim: true,
        required: true,
    },
    email: {
        type: String,
        trim: true,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        min: 6,
        max: 64,
    },
    picture: {
        type: String,
        default: '/avatar.png',
    },
    role: {
        type: [String],
        default: ['Subscriber'],
        enum: ['Subscriber', 'Instructor'], 
    },
    /* stripe_account_id: '',
    stripe_seller: {},
    stripeSession: {}, */

    account_seller: {},
    profits: 0,
    passwordResetCode: {
        data: String,
        default: "",
    },
    courses: [{ type: ObjectId, ref: 'Course' }],
}, { timestamps: true });

export default model('User', userSchema);

