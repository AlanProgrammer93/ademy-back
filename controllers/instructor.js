import User from '../models/user';
import Course from '../models/course';
import queryString from 'query-string';
const stripe = require('stripe')(process.env.STRIPE_SECRET);

/* export const makeInstructor = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).exec();
        if (!user.stripe_account_id) {
            const account = await stripe.accounts.create({ type: "express" });
            //console.log("ACCOUNT => ", account.id);
            user.stripe_account_id = account.id;
            user.save();
        }
        // crear enlace de cuenta basado en id de la cuenta 
        let accountLink = await stripe.accountLinks.create({
            account: user.stripe_account_id,
            refresh_url: process.env.STRIPE_REDIRECT_URL,
            return_url: process.env.STRIPE_REDIRECT_URL,
            type: "account_onboarding",
        });
        //console.log(accountLink);
        // rellenar alguna info camo email (opcional), luego enviar url al frontend
        accountLink = Object.assign(accountLink, {
            "stripe_user[email]": user.email,
        });
        // enviar el enlace como respuesta
        res.send(`${accountLink.url}?${queryString.stringify(accountLink)}`);
    } catch (error) {
        console.log("ERROR EN CREAR INSTRUCTOR ", error);
    }
} */

export const makeInstructor = async (req, res) => {
    try {
        console.log(req.body);
        const user = await User.findById(req._id).exec();
        if (!user.account_seller) {
            user.account_seller = req.body;
            user.role = 'Instructor';
            user.save();
            
            res.send({ ok: true });
        } else {
            res.send({ message: 'Ya eres instructo y tienes una cuenta bancaria asignada.' });
        }
        
    } catch (error) {
        console.log("ERROR EN CREAR INSTRUCTOR ", error);
    }
} 

export const getAccountStatus = async (req, res) => {
    try {
        const user = await User.findById(req._id).exec();
        const account = await stripe.accounts.retrieve(user.stripe_account_id);
        console.log("ACCOUNT", account);
        
        if (!account.charges_enabled) {
            return res.status(401).send("Unauthorized");
        } else {
            const statusUpdated = await User.findByIdAndUpdate(user._id, {
                stripe_seller: account,
                $addToSet: {role: 'Instructor'},
            }, { new: true }).select('-password').exec();

            res.json(statusUpdated);
        }
    } catch (error) {
        console.log(error);
    }
}

export const currentInstructor = async (req, res) => {
    try {
        let user = await User.findById(req._id)
            .select('-password')
            .exec();
        if (!user.role.includes('Instructor')) {
            return res.sendStatus(403);
        } else {
            res.json({ ok: true });
        }
    } catch (error) {
        console.log(error);
    }
}

export const instructorCourses = async (req, res) => {
    try {
        const courses = await Course.find({instructor: req._id})
            .sort({createdAt: -1})
            .exec();
            
        res.json(courses);
    } catch (error) {
        console.log(error);
    }
}

export const studentCount = async (req, res) => {
    try {
        console.log(req.body.courseId);
        const users = await User.find({courses: req.body.courseId})
            .select('_id')
            .exec();

        res.json(users);
    } catch (error) {
        console.log(error);
    }
}

/* export const instructorBalance = async (req, res) => {
    try {
        let user = await User.findById(req._id).exec();
        const balance = await stripe.balance.retrieve({
            stripeAccount: user.stripe_account_id,
        });
        res.json(balance);
    } catch (error) {
        console.log(error);
    }
}

export const instructorPayoutSettings = async (req, res) => {
    try {
        let user = await User.findById(req._id).exec();
        const loginLink = await stripe.accounts.createLoginLink(
            user.stripe_seller.id,
            { redirect_url: process.env.STRIPE_SETTING_REDIRECT },
        );
        res.json(loginLink.url);
    } catch (error) {
        console.log(error);
    }
} */
