const NodeMediaServer = require('node-media-server');
const express = require('express');
var bodyParser = require('body-parser');

const MediaServer = require('./mediaserver');

const app = express();
const mediaserver = new MediaServer('127.0.0.1');


app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('./'));


const rtmpUrl = 'rtmp://127.0.0.1/live/';

app.post('/offer', async (req, res) => {

    console.log('request body', req.body);
    
    let stream = req.body.stream;
    let offer = req.body.offer;
    let answer = await mediaserver.offerStream(stream, offer);
    console.log('answer', answer);
    res.json({answer:answer});
})

app.listen(4001, function () {
    console.log('Example app listening on port 4001!\n');
    console.log('Open http://localhost:4001/');
})

const config = {
    rtmp: {
        port: 1935,
        chunk_size: 1024,
        gop_cache: true,
        ping: 60,
        ping_timeout: 30
    },
    http: {
        port: 8000,
        allow_origin: '*'
    }
};

const nms = new NodeMediaServer(config)
nms.run();


nms.on('postPublish', (id, StreamPath, args) => {
    console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
    // we need to transcode
    mediaserver.createStream('live',rtmpUrl);
});

nms.on('donePublish', (id, StreamPath, args) => {
    console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});
