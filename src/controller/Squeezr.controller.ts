import {Request, Response, Router} from 'express'
import IControllerBase from './IControllerBase.interface'
import ISqueezr from "../model/Squeezr.interface";
import {nanoid} from "nanoid";
import * as yup from "yup";


class SqueezrController implements IControllerBase {
    public router = Router()
    private db;

    constructor(db: PouchDB.Database<{}>) {
        this.initRoutes()
        this.db = db;
    }

    public initRoutes() {
        this.router.get('/:shortcode', this.get)
        this.router.post('/squeeze', this.squeeze)
    }

    get = async (req: Request, res: Response) => {

        const {shortcode} = req.params
        try {
            const data: ISqueezr = await this.db.get(shortcode)
            data.visits.push(new Date())
            await this.db.put(data)

            res.redirect(302, data.longUrl)
        } catch (err) {
            if (err.status == 404) {
                let err = {message: `Shortcode not found: ${shortcode}`};
                this.handleError(err, res, 404, err.message)
            } else {
                this.handleError(err, res, undefined, undefined)
            }
        }
    }

    squeeze = async (req: Request, res: Response) => {

        let {fullUrl, customSlug} = req.body

        try {
            if (!await yup.string().trim().url().required().isValid(fullUrl)) {
                throw {errors: ['fullUrl must be a valid URL']};
            }

            if (!await yup.string().isValid(customSlug)) {
                throw {errors: ['customSlug is not a valid string']};
            }

            if (!customSlug) {
                customSlug = nanoid(6)
            }

            const data: ISqueezr = {
                _id: customSlug,
                longUrl: fullUrl,
                shortUrl: `${process.env.APP_BASE_URL}/${customSlug}`,
                visits: []
            }

            const {longUrl, shortUrl} = data

            this.db.put(data).then((_) => {
                res.status(201).send({
                    message: 'URL shortened',
                    longUrl,
                    shortUrl
                })
            }).catch(err => {
                if (err.status == 409) {
                    this.handleError(err, res, 409, `${customSlug} already existing. Please choose another one.`)
                } else {
                    this.handleError(err, res, undefined, 'Failed to save document to database.')
                }
            });
        } catch (err) {
            this.handleError(err, res, 400, 'Validation failed.', err.errors)
        }

    }

    handleError = (err: any, res: Response, customStatusCode?: number, optMessage?: string, optDetails?: Array<any>) => {
        customStatusCode ? console.warn(err) : console.error(err);
        res.status(customStatusCode ? customStatusCode : 500).send({
            message: optMessage ? optMessage : 'Oops. This is an unexpected error.',
            details: optDetails ? optDetails : []
        })
    }
}

export default SqueezrController