import User from '../models/user';
import { hashPassword, comparePassword } from '../utils/auth';
import jwt from 'jsonwebtoken';
import AWS from 'aws-sdk';
import { nanoid } from 'nanoid';

const awsConfig = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    apiVersion: process.env.AWS_API_VERSION
}

const SES = new AWS.SES(awsConfig);

export const register = async (req, res) => {
    try {
        const {name, email, password} = req.body;

        if (!name) return res.status(400).send('El nombre es requerido.');
        if (!password || password.length < 6) 
            return res.status(400).send('La contraseña es requerida y debe ser al menos 6 caracteres.');

        let userExist = await User.findOne({ email }).exec();
        if (userExist) return res.status(400).send('El email está en uso.');

        const hashedPassword = await hashPassword(password);

        const user = new User({
            name,
            email,
            password: hashedPassword
        });
        await user.save();

        return res.json({ ok: true, name });
    } catch (error) {
        return res.status(400).send('Error. Intentelo Otra Ves.');
    }
}

export const login = async (req, res) => {
    try {
        const {email, password} = req.body;
        const user = await User.findOne({ email }).exec();
        if (!user) return res.status(400).send('Usuario no encontrado.');

        const match = await comparePassword(password, user.password);
        
        if (!match) return res.status(400).send('Credenciales Invalidas');

        const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET, {expiresIn: '7d'});

        user.password = undefined;
        res.cookie('token', token, {
            httpOnly: true,
            //secure: true, // only works on https
        });
        res.json({
            user,
            token
        });
    } catch (error) {
        console.log(error);
        return res.status(400).send('Error. Intentelo otra ves.');
    }
}

/* export const renewToken = async (req, res) => {

    const uid = req.uid;

    const token = await generarJWT( uid );

    const usuario = await Usuario.findById( uid );

    res.json({
        ok: true,
        usuario,
        token
    });
} */

export const logout = async (req, res) => {
    try {
        res.clearCookie('token');
        return res.json({ message: "Signout success" });
    } catch (error) {
        console.log(error);
    }
}

export const currentUser = async (req, res) => {
    try {
        const user = await User.findById(req._id).select("-password").exec();
        return res.json({ ok: true });
    } catch (error) {
        console.log(error);
    }
}

export const sendTestEmail = async (req, res) => {
    const params = {
        Source: process.env.EMAIL_FROM,
        Destination: {
            ToAddresses: ['alan.zuritanuevo@gmail.com']
        },
        ReplyToAddresses: [process.env.EMAIL_FROM],
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: `
                        <html>
                            <h1>Restaurar Contraseña</h1>
                            <p>Usa el siguiente enlace para restaurar tu contraseña.</p>
                        </html>
                    `
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: 'Restaurar Contraseña',
            }
        }
    }

    const emailSent = SES.sendEmail(params).promise();

    emailSent
        .then(data => {
            console.log(data);
            res.json({ ok: true });
        })
        .catch(err => {
            console.log("error en test", err);
        })
}

export const forgotPassword = async (req, res) => {
    try {
        const {email} = req.body;
        const shortCode = nanoid(6).toUpperCase();
        const user = await User.findOneAndUpdate({ email }, { passwordResetCode: shortCode });
        if (!user) return res.status(400).send("Usuario no encontrado");
        const params = {
            Source: process.env.EMAIL_FROM,
            Destination: {
                ToAddresses: [email]
            },
            //ReplyToAddresses: [process.env.EMAIL_FROM],
            Message: {
                Body: {
                    Html: {
                        Charset: 'UTF-8',
                        Data: `
                            <html>
                                <h1>Restablecer Contraseña</h1>
                                <p>Use este codigo para restablecer tu contraseña</p>
                                <h2 style="color:red">${shortCode}</h2>
                                <i>Ademy.com</i>
                            </html>
                        `
                    }
                },
                Subject: {
                    Charset: 'UTF-8',
                    Data: 'Restablecer Contraseña',
                }
            }
        }

        const emailSent = SES.sendEmail(params).promise();
        emailSent.then((data) => {
            console.log(data);
            res.json({ ok: true });
        }).catch((err) => {
            console.log(err);
        });
    } catch (error) {
        console.log(error);
    }
}

export const resetPassword = async (req, res) => {
    try {
        const {email, code, newPassword} = req.body;
        const hashedPassword = await hashPassword(newPassword);

        const user = User.findOneAndUpdate({
            email,
            passwordResetCode: code,
        }, {
            password: hashedPassword,
            passwordResetCode: "",
        }).exec();
        res.json({ ok: true });
    } catch (error) {
        console.log(error);
        return res.status(400).send('Error. Intentelo de nuevo');
    }
}
