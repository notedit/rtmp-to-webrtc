const NodeMediaServer = require('node-media-server');
const express = require('express');
const bodyParser = require('body-parser');

const MediaServer = require('./mediaserver');

const app = express();
const mediaserver = new MediaServer('127.0.0.1');


app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('./'));


const baseRtmpUrl = 'rtmp://127.0.0.1/live/';


app.post('/watch/:stream', async (req, res) => {

    console.log('request body', req.body);

    let stream = req.params.stream;
    let offer = req.body.offer;

    // If we did handle the stream yet
    if (!mediaserver.getStream(stream)) {
        await mediaserver.createStream(stream, baseRtmpUrl + stream);
    }

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
        local_header: true,
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

});

nms.on('donePublish', (id, StreamPath, args) => {
    console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});
