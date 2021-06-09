import 'regenerator-runtime/runtime'
import request from 'supertest'
import App from '../app'

process.env.APP_DB_INMEMORY = 1;
let app = new App({port: undefined})
let express = app.getExpress()

describe('Test endpoints success', () => {

    it('should create a new short url 201 - no custom slug', async () => {
        const res = await request(express)
            .post('/squeeze')
            .send({
                fullUrl: "https://www.web.de",
            })
        assertDefaults(res)
        const slug = getSlug(res)
        expect(slug.length).toBe(6)
    })

    it('should create a new short url 201 - with custom slug', async () => {
        const res = await request(express)
            .post('/squeeze')
            .send({
                fullUrl: "https://www.web.de",
                customSlug: "test-slug"
            })
        assertDefaults(res)
        const slug = getSlug(res)
        expect(slug).toBe('test-slug')
    })

    it('should redirect 302', async () => {
        await request(express)
            .post('/squeeze')
            .send({
                fullUrl: "https://www.web.de",
                customSlug: "test-slug"
            })

        const res = await request(express)
            .get('/test-slug')
        expect(res.statusCode).toEqual(302)
    })
})

describe('Test error handling', () => {

    it('should not create a slug for invalid url 400', async () => {
        const res = await request(express)
            .post('/squeeze')
            .send({
                fullUrl: "httpz:/www.web_de"
            })

        const details = assertDefaultErrorAndReturnDetails(res)
        expect(details[0]).toBe('fullUrl must be a valid URL')
    })

    it('should not create a slug for invalid slug 400', async () => {
        const res = await request(express)
            .post('/squeeze')
            .send({
                fullUrl: "https://www.web.de",
                customSlug: {"malicious": "attempt"}
            })

        const details = assertDefaultErrorAndReturnDetails(res)
        expect(details[0]).toBe('customSlug is not a valid string')
    })

    it('should not create a slug twice 409', async () => {
        await request(express)
            .post('/squeeze')
            .send({
                fullUrl: "https://www.web.de",
                customSlug: "test-slug"
            })

        const res = await request(express)
            .post('/squeeze')
            .send({
                fullUrl: "https://www.web.de",
                customSlug: "test-slug"
            })

        expect(res.statusCode).toEqual(409)
        let resultBody = res.body;
        expect(resultBody).toHaveProperty('message')
        expect(resultBody.message).toBe('test-slug already existing. Please choose another one.')
    })

    it('should not redirect 404', async () => {
        const res = await request(express)
            .get('/take-me-to-dev-null')
        expect(res.statusCode).toEqual(404)
        let resultBody = res.body;
        expect(resultBody).toHaveProperty('message')
        expect(resultBody.message).toBe('Shortcode not found: take-me-to-dev-null')
    })

})

describe('Test statistics endpoint', () => {

    it('should return statistics - non empty', async () => {
        await clearDb()

        // get the statistics before actually expecting some
        const {totalSqueezes, totalVisitsLastDay, allDocs} = await requestStatistics();
        expect(totalSqueezes).toBe(0)
        expect(totalVisitsLastDay).toBe(0)
        expect(allDocs.length).toBe(0)

        // create test slugs
        await request(express)
            .post('/squeeze')
            .send({
                fullUrl: "https://www.web.de",
                customSlug: "test-slug1"
            })

        await request(express)
            .post('/squeeze')
            .send({
                fullUrl: "https://www.web.de",
                customSlug: "test-slug2"
            })

        // simulate visits
        await request(express)
            .get('/test-slug1')
        await request(express)
            .get('/test-slug2')
        await request(express)
            .get('/test-slug2')

        // manipulate DB entry to have a click last year, which should not get counted
        const testDoc1 = await app.db.get('test-slug1')
        testDoc1.visits.push(new Date('2020-06-09T12:47:19.817Z'))
        await app.db.put(testDoc1)

        const {totalSqueezes: totalSqueezes2, totalVisitsLastDay: totalVisitsLastDay2, allDocs : allDocs2} = await requestStatistics();
        expect(totalSqueezes2).toBe(2)
        expect(totalVisitsLastDay2).toBe(3)
        expect(allDocs2.length).toBe(2)

        // lets see if the manipulated doc is counting visits last day correctly
        const foundDoc1 = allDocs2.find(element => element._id === 'test-slug1')
        expect(foundDoc1).not.toBeNull()
        expect(foundDoc1.visits.length).toBe(2)
        expect(foundDoc1.visitsLastDay).toBe(1)

        // just make sure our second created element is also existing
        const foundDoc2 = allDocs.find(element => element._id === 'test-slug2')
        expect(foundDoc2).not.toBeNull()
    })

})

async function clearDb() {
    return app.db.allDocs().then(function (result) {
        return Promise.all(result.rows.map(function (row) {
            return app.db.remove(row.id, row.value.rev);
        }));
    });
}

async function requestStatistics() {
    const res = await request(express)
        .get('/statistics')

    // do the asserts
    expect(res.statusCode).toEqual(200)
    const resultBody = res.body;

    expect(resultBody).toHaveProperty('totalSqueezes')
    expect(resultBody).toHaveProperty('totalVisitsLastDay')
    expect(resultBody).toHaveProperty('allDocs')

    const {totalSqueezes, totalVisitsLastDay, allDocs} = res.body
    return {totalSqueezes, totalVisitsLastDay, allDocs};
}

function assertDefaults(res) {
    expect(res.statusCode).toEqual(201)
    const resultBody = res.body;
    expect(resultBody).toHaveProperty('message')
    expect(resultBody.message).toEqual('URL shortened')
    expect(resultBody).toHaveProperty('longUrl')
    expect(resultBody.longUrl).toEqual('https://www.web.de')
    expect(resultBody).toHaveProperty('shortUrl')
    expect(resultBody.shortUrl).toContain('/')
}

function assertDefaultErrorAndReturnDetails(res) {
    expect(res.statusCode).toEqual(400)
    const resultBody = res.body;
    expect(resultBody).toHaveProperty('message')
    expect(resultBody.message).toBe('Validation failed.')
    expect(resultBody).toHaveProperty('details')
    const details = resultBody.details
    expect(details.length).toBe(1)
    return details;
}

function getSlug(res) {
    const shortUrl = res.body.shortUrl
    return shortUrl.substr(shortUrl.lastIndexOf('/') + 1)
}