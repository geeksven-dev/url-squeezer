import App from './app'

const app = new App({
    port: process.env.PORT ? parseInt(process.env.PORT) : 5000
})

app.listen()