import Fastify from 'fastify'
import { env } from './config/env.js'
import { ensureBucket } from './lib/s3.js'

const app = Fastify({logger:true})


app.get('/ola',(req,reply) =>{
    return 'Hello world'
})

await ensureBucket()

app.listen({port:env.PORT}).then(() => {
    console.log('API rodando em http://localhost:3333')
})