import express, {Application} from 'express'
import PouchDB from 'pouchdb';
import pouchdbAdapterMemory from 'pouchdb-adapter-memory'
import 'dotenv/config';
import SqueezrController from "./controller/Squeezr.controller";
import StatisticsController from "./controller/Statistics.controller";


class App {
    public app: Application
    public port: number
    public db: PouchDB.Database;

    constructor(appInit: { port: number; }) {
        this.app = express()
        this.port = appInit.port
        let dbAdapterConfiguration = {}

        if (process.env.APP_DB_INMEMORY === '1') {
            PouchDB.plugin(pouchdbAdapterMemory);
            dbAdapterConfiguration = {adapter: 'memory'}
        }

        this.db = new PouchDB('squeezr', dbAdapterConfiguration)

        this.initMiddleWare()
        this.routes([
            new StatisticsController(this.db),
            new SqueezrController(this.db)
        ])
    }

    private routes(controllers: { forEach: (arg0: (controller: any) => void) => void; }) {
        controllers.forEach(controller => {
            this.app.use('/', controller.router)
        })
    }

    private initMiddleWare() {
        this.app.use(express.json())
    }

    public listen() {
        return this.app.listen(this.port, () => {
            console.log(`App listening on the http://localhost:${this.port}`)
        })
    }

    public getExpress() {
        return this.app;
    }
}

export default App