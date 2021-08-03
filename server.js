import express from 'express';
import cors from 'cors';
import fs from 'fs';
import mongoose from 'mongoose';
const morgan = require('morgan');
import csrf from 'csurf';
import cookieParser from 'cookie-parser';
require('dotenv').config();

const csrfProtection = csrf({ cookie: true });


const app = express();

// db
mongoose.connect(process.env.DATABASE,{
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    useCreateIndex: true,
})
.then(() => console.log('DB CONNECTED'))
.catch((err) => console.log('ERROR CONNECTED ', err));


// middlewares
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use(morgan('dev'));


// routes
fs.readdirSync('./routes').map((r) => app.use('/api', require(`./routes/${r}`)));

// csfr
app.use(csrfProtection);

app.get('/api/csrf-token', (req, res) => {
    res.json({csrfToken: req.csrfToken()});
})

const PORT = process.env.PORT || 8001;

app.listen(PORT, () => console.log(`Servidor en ${PORT}`));
