import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}))
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))
app.use(cookieParser())

app.get('/home/admin', (req, res) => {
    res.send('Welcome to Home Admin')
})


export default app
