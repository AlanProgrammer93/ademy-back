import expressJwt from 'express-jwt';
import User from '../models/user';
import Course from '../models/course';
import jwt from 'jsonwebtoken';

/* export const requireSignin = expressJwt({
    getToken: (req, res) => req.cookies.token,
    secret: process.env.JWT_SECRET,
    algorithms: ["HS256"],
}); */

export const requireSignin = (req, res, next) => {
    try {
        const token = req.header('x-token');
        if (!token) {
            return res.status(401).json({
                ok: false,
                msg: 'No hay token en la peticion'
            });
        }

        const {_id} = jwt.verify(token, process.env.JWT_SECRET);
        req._id = _id;
        
        next();

    } catch (error) {
        return res.status(401).json({
            ok: false,
            msg: 'Token no es valido'
        });
    }
}

export const isInstructor = async (req, res, next) => {
    try {
        const user = await User.findById(req._id).exec();
        if (!user.role.includes('Instructor')) {
            return res.sendStatus(403);
        } else {
            next();
        }
    } catch (error) {
        console.log(error);
    }
}

export const isEnrolled = async (req, res, next) => {
    try {
        const user = await User.findById(req._id).exec();
        const course = await Course.findOne({ slug: req.params.slug }).exec();

        let ids = [];
        for (let i = 0; i < user.courses.length; i++) {
            ids.push(user.courses[i].toString());
        }

        if (!ids.includes(course._id.toString())) {
            res.sendStatus(403);
        } else {
            next();
        }
    } catch (error) {
        console.log(error);
    }
}
