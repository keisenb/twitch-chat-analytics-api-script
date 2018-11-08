require('dotenv').load();
const MongoClient = require('mongodb').MongoClient;
const log = require('node-file-logger');
const assert = require('assert');
const axios = require('axios');

log.SetUserOptions({
    timeZone: 'America/Chicago',
    folderPath: './logs/',
    dateBasedFileNaming: true,
    fileNamePrefix: 'kevin_',
    fileNameExtension: '.log',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm:ss.SSS',
    logLevel: 'debug',
    onlyFileLogging: true
});

const dbName = process.env.ENV;
const mongoClient = new MongoClient(process.env.MONGO, { useNewUrlParser: true });

(async function () {
    await mongoClient.connect();
    console.log("Connected correctly to mongo server");
})();

setInterval(getViewers, 30000, process.env.STREAMER_ID, process.env.CLIENT_ID, process.env.USERNAME);

async function storeViewers(viewers, chatters, type, game_id, started_at, streamer_id, username) {
    try {
        const db = mongoClient.db(dbName);
        var val = { viewer_count: viewers, chatter_count: chatters, type: type, game_id: game_id, started_at: started_at, recorded: new Date(), username: username, streamer_id: streamer_id };
        let r = await db.collection('viewers').insertOne(val);
        assert.equal(1, r.insertedCount);
    } catch (err) {
        console.log(err.stack);
        log.Error(err);
    }
}

function getViewers(streamer_id, client_id, username) {
    axios.all([
        axios.get('https://tmi.twitch.tv/group/user/' + username),
        axios.get('https://api.twitch.tv/helix/streams?user_id=' + streamer_id, { headers: { 'Client-ID': client_id } })
    ]).then(axios.spread((chatters, viewers) => {
        var result = viewers.data.data.find(function (res) {
            if (res.user_id == streamer_id) {
                return res;
            }
        });
        if(result !== undefined) {
            storeViewers(result.viewer_count, chatters.data.chatter_count, result.type, result.game_id, result.started_at, streamer_id, username);
        } else {
            console.log('stream is not active...');
        }
      })).catch(error => {
        log.Error('Error getting viewers', 'service', 'getViewers', error);
        console.log(error);
      });
}

