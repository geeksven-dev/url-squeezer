import IControllerBase from "./IControllerBase.interface";
import {Request, Response, Router} from "express";

const ONE_DAY = 1000 * 60 * 60 * 24;

class StatisticsController implements IControllerBase {
    public router = Router()
    private db;

    constructor(db: PouchDB.Database<{}>) {
        this.initRoutes()
        this.db = db;
    }

    initRoutes(): any {
        this.router.get('/statistics', this.statistics)
    }

    statistics = async (req: Request, res: Response) => {
        const refDate = new Date()
        const allDocsWithMetadata = await this.db.allDocs({include_docs: true})
        const allDocs = allDocsWithMetadata.rows.map((row) => {
            const doc: any = row.doc
            doc.visitsLastDay = this.calculateVisitsLastDay(doc, refDate)
            return doc
        });

        const mpf = (doc: any, emit: any) => emit('visits', this.calculateVisitsLastDay(doc, refDate))
        const mapReduceResult = await this.db.query({map: mpf, reduce: "_sum"}, {reduce: true, group: true, group_level: 1});

        res.json({
            totalSqueezes: allDocs.length,
            totalVisitsLastDay: mapReduceResult.rows[0] ? mapReduceResult.rows[0].value : 0,
            allDocs
        })

    }

    calculateVisitsLastDay = (doc: any, refDate: Date) => {
        return doc.visits.filter((visit: string) => (refDate.getTime() - new Date(visit).getTime()) < ONE_DAY).length;
    }

}

export default StatisticsController