interface ISqueezr {
    _id: string,
    longUrl: string,
    shortUrl?: string,
    visits: Array<Date>
}

export default ISqueezr