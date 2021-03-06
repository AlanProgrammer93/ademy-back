import AWS from 'aws-sdk';
import { nanoid } from 'nanoid';
import Course from '../models/course';
import User from '../models/user';
import Completed from '../models/completed';
import slugify from 'slugify';
import {readFileSync} from 'fs';
const stripe = require('stripe')(process.env.STRIPE_SECRET);

const awsConfig = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    apiVersion: process.env.AWS_API_VERSION
}

const S3 = new AWS.S3(awsConfig);

export const uploadImage = async (req, res) => {
    try {
        const {image} = req.body;
        if (!image) return res.status(400).send('No Hay Imagen');

        const base64Data = new Buffer.from(
            image.replace(/^data:image\/\w+;base64,/, ''),
            "base64"
        );

        const type = image.split(';')[0].split('/')[1];

        const params = {
            Bucket: "edemy-alan-bucket",
            Key: `${nanoid()}.${type}`,
            Body: base64Data,
            ACL: 'public-read',
            ContentEncoding: "base64",
            ContentType: `image/${type}`,
        }

        S3.upload(params, (err, data) => {
            if (err) {
                console.log(err);
                return res.sendStatus(400);
            }
            console.log(data);
            res.send(data);
        });
    } catch (error) {
        console.log(error);
    }
}

export const removeImage = async (req, res) => {
    try {
        const {image} = req.body;
        const params = {
            Bucket: image.Bucket,
            Key: image.Key,
        }

        S3.deleteObject(params, (err, data) => {
            if (err) {
                console.log(err);
                res.sendStatus(400);
            }
            res.send({ ok: true });
        })
    } catch (error) {
        console.log(error);
    }
}

export const create = async (req, res) => {
    try {
        const alreadyExist = await Course.findOne({
            slug: slugify(req.body.name.toLowerCase())
        });
        if (alreadyExist) return res.status(400).send('El titulo est?? en uso.');

        const course = await new Course({
            slug: slugify(req.body.name),
            instructor: req._id,
            ...req.body,
        }).save();

        res.json(course);
    } catch (error) {
        console.log(error);
        return res.status(400).send('Error al crear curso. Intentelo otra ves.');
    }
}

export const read = async (req, res) => {
    try {
        const course = await Course.findOne({ slug: req.params.slug })
            .populate('instructor', '_id name')
            .exec();
            
        res.json(course);
    } catch (error) {
        console.log(error);
    }
}

export const uploadVideo = async (req, res) => {
    try {
        if (req._id != req.params.instructorId) {
            return res.status(400).send('Unauthorized');
        }

        const { video } = req.files;
        if (!video) return res.status(400).send('No hay video');

        const params = {
            Bucket: "edemy-alan-bucket",
            Key: `${nanoid()}.${video.type.split('/')[1]}`,
            Body: readFileSync(video.path),
            ACL: 'public-read',
            ContentType: video.type,
        }

        S3.upload(params, (err, data) => {
            if (err) {
                console.log(err);
                res.sendStatus(400);
            }
            res.send(data);
        })
    } catch (error) {
        console.log(error);
    }
}

export const removeVideo = async (req, res) => {
    try {
        if (req._id != req.params.instructorId) {
            return res.status(400).send('Unauthorized');
        }

        const { Bucket, Key } = req.body;
      
        const params = {
            Bucket,
            Key,
        }

        S3.deleteObject(params, (err, data) => {
            if (err) {
                console.log(err);
                res.sendStatus(400);
            }
            res.send({ ok: true });
        })
    } catch (error) {
        console.log(error);
    }
} 

export const addLesson = async (req, res) => {
    try {
        const { slug, instructorId } = req.params;
        const { title, content, video } = req.body;

        if (req._id != instructorId) {
            return res.status(400).send('Unauthorized');
        }

        const updated = await Course.findOneAndUpdate({slug}, {
            $push: {lessons: {title, content, video, slug: slugify(title)}}
        },
        { new: true })
        .populate('instructor', '_id name')
        .exec();

        res.json(updated);
    } catch (error) {
        console.log(error);
        return res.status(400).send('Error AL Agregar Leccion');
    }
}

export const update = async (req, res) => {
    try {
        const {slug} = req.params;
        const course = await Course.findOne({ slug }).exec();

        if (req._id != course.instructor) {
            return res.status(400).send('Unauthorized');
        }

        const updated = await Course.findOneAndUpdate({slug}, req.body, {new: true}).exec();

        res.json(updated);
    } catch (error) {
        console.log(error);
        return res.status(400).send('Error al editar curso.');
    }
}

export const removeLesson = async (req, res) => {
    try {
        const {slug, lessonId} = req.params;
        const course = await Course.findOne({ slug }).exec();

        if (req._id != course.instructor) {
            return res.status(400).send('Unauthorized');
        }

        const deleteCourse = await Course.findByIdAndUpdate(course._id, {
            $pull: { lessons: { _id: lessonId } },
        }).exec();

        res.json({ ok: true });
    } catch (error) {
        console.log(error);
        return res.status(400).send('Error al eliminar curso.');
    }
}

export const updateLesson = async (req, res) => {
    try {
        const {slug} = req.params;
        const {_id, title, content, video, free_preview} = req.body;
        const course = await Course.findOne({slug}).select('instructor').exec();

        if (course.instructor._id != req._id) {
            return res.status(400).send('Unauthorized');
        }

        const updated = await Course.updateOne({'lessons._id': _id}, {
            $set: {
                "lessons.$.title": title,
                "lessons.$.content": content,
                "lessons.$.video": video,
                "lessons.$.free_preview": free_preview,
            },
        },
        { new: true }).exec();

        res.json({ ok: true });
    } catch (error) {
        console.log(error);
        return res.status(400).send('Error al editar leccion');
    }
}

export const publishCourse = async (req, res) => {
    try {
        const {courseId} = req.params;
        const course = await Course.findById(courseId).select('instructor').exec();

        if (req._id != course.instructor._id) {
            return res.status(400).send('Unauthorized');
        }

        const updated = await Course.findByIdAndUpdate(
            courseId,
            { published: true },
            { new: true }
        ).exec();

        res.json(updated);
    } catch (error) {
        console.log(error);
        return res.status(400).send('Error al publicar curso.');
    }
}

export const unpublishCourse = async (req, res) => {
    try {
        const {courseId} = rq.params;
        const course = await Course.findById(courseId).select('instructor').exec();

        if (req._id != course.instructor._id) {
            return res.status(400).send('Unauthorized');
        }

        const updated = await Course.findByIdAndUpdate(
            courseId,
            { published: false },
            { new: true }
        ).exec();

        res.json(updated);
    } catch (error) {
        console.log(error);
        return res.status(400).send('Error al eliminar curso.');
    }
}

export const courses = async (req, res) => {
    const all = await Course.find({ published: true })
        .populate('instructor', '_id name')
        .exec();

    res.json(all);
}

export const checkEnrollment = async (req, res) => {
    const {courseId} = req.params;
    const user = await User.findById(req._id).exec();

    let ids = [];
    let length = user.courses && user.courses.length;

    for (let i = 0; i < length; i++) {
        ids.push(user.courses[i].toString());
    }

    res.json({
        status: ids.includes(courseId),
        course: await Course.findById(courseId).exec(),
    });
}

export const freeEnrollment = async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId).exec();
        if (course.paid) return;

        const result = await User.findByIdAndUpdate(req._id, {
            $addToSet: { courses: course._id },
        }, { new: true }).exec();

        res.json({
            message: 'Felicitaciones! Te enrolaste al curso correctamente.',
            course,
        })
    } catch (error) {
        console.log('error el enrolarse gratis', error);
        return res.status(400).send('Error al enrolar');
    }
}

export const paidEnrollment = async (req, res) => {
    try {
        
        const course = await Course.findById(req.params.courseId)
            .populate('instructor')
            .exec();
        if (!course.paid) res.json({ success: false });

        // TODO: Validar que los datos de la tarjeta sean correctos
        
        const user = await User.findById(req._id).exec();
        if (user.courses.includes(course._id)) res.json({ success: false });

        const fee = (course.price * 70) / 100;
        const profitInstructor = Math.round(fee.toFixed(2));
        // TODO: Enviar las ganancias a la cuenta del instructor (con stripe o alguna otra pasarela de pago)
        await User.findByIdAndUpdate(user._id, { 
            $addToSet: { courses: course._id },
        }).exec();
        await User.findByIdAndUpdate(course.instructor._id, { 
            $inc: {profits: profitInstructor}
        }).exec();

        res.json({ success: true, course });

    } catch (error) {
        console.log('Error en paidEnrollment', error);
        return res.status(400).send('Error al pagar el curso');
    }
}

export const stripeSuccess = async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId).exec();
        const user = await User.findById(req._id).exec();
        if (!user.stripeSession.id) return res.sendStatus(400);

        const session = await stripe.checkout.sessions.retrieve(
            user.stripeSession.id
        );

        if (session.payment_status === 'paid') {
            await User.findByIdAndUpdate(user._id, { 
                $addToSet: { courses: course._id },
                $set: {stripeSession: {}},
            }).exec();
        }

        res.json({ success: true, course });
    } catch (error) {
        console.log('Error en stripeSuccess ', error);
        res.json({ success: false });
    }
}

export const userCourses = async (req, res) => {
    const user = await User.findById(req._id).exec();
    const courses = await Course.find({_id: { $in: user.courses }})
        .populate('instructor', '_id name')
        .exec();
    
    res.json(courses);
}

export const markCompleted = async (req, res) => {
    const {courseId, lessonId} = req.body;
    const existing = await Completed.findOne({
        user: req._id,
        course: courseId,
    }).exec();

    if (existing) {
        const updated = await Completed.findOneAndUpdate(
            {
                user: req._id,
                course: courseId,
            },
            {
                $addToSet: { lessons: lessonId },
            }
        ).exec();

        res.json({ ok: true });
    } else {
        const created = await new Completed({
            user: req._id,
            course: courseId,
            lessons: lessonId,
        }).save();

        res.json({ ok: true });
    }
}

export const listCompleted = async (req, res) => {
    try {
        const list = await Completed.findOne({
            user: req._id, 
            course: req.body.courseId
        }).exec();

        list && res.json(list.lessons);
    } catch (error) {
        console.log(error);
    }
}

export const markIncompleted = async (req, res) => {
    try {
        const {courseId, lessonId} = req.body;
        
        const updated = await Completed.findOneAndUpdate(
            {
                user: req._id,
                course: courseId,
            },
            {
                $pull: { lessons: lessonId },
            }
        ).exec();

        res.json({ ok: true });
    } catch (error) {
        console.log(error);
    }
}