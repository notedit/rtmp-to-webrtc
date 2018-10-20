const NodeMediaServer = require('node-media-server');
const express = require('express');
const bodyParser = require('body-parser');
const ffmpeg = require('fluent-ffmpeg');
const MediaServer = require('./mediaserver');

const app = express();

// need change is ip address
const mediaserver = new MediaServer('127.0.0.1');


app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('./'));


const baseRtmpUrl = 'rtmp://127.0.0.1/live/';

app.get('/test', async (req, res) => {
    res.send('hello world')
})

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
    }
};


const nms = new NodeMediaServer(config)

nms.on('postPublish', (id, StreamPath, args) => {
    console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);

});

nms.on('donePublish', (id, StreamPath, args) => {
    console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.run();


// now we need simulate a rtmp stream 


/*

ffmpeg -f lavfi -re -i color=black:s=640x480:r=15 -filter:v "drawtext=text='%{localtime\:%T}':fontcolor=white:fontsize=80:x=20:y=20" -vcodec libx264 -tune zerolatency -preset ultrafast -g 15 -keyint_min 15 -profile:v baseline -level 3.0 -pix_fmt yuv420p -r 15 -f flv rtmp://localhost/live/live

*/

setTimeout(() => {

    // const outStream = 'rtmp://localhost/live/live'
    // ffmpeg()
    // .input('color=black:s=640x480:r=15')
    // .inputFormat('lavfi')
    // .inputOptions([
    //     '-re'
    // ])
    // .videoFilters([{
    //     filter: 'drawtext',
    //     options: {
    //         fontfile:'./Arial.ttf',
    //         text:"%{localtime\:%T}",
    //         fontcolor:'white',
    //         fontsize:60,
    //         x:10,
    //         y:20
    //     }
    // },])
    // .output(outStream)
    // .outputOptions([
    //     '-flags:v +global_header',
    //     '-bsf:v h264_mp4toannexb,dump_extra',
    //     '-vcodec libx264',
    //     '-tune zerolatency',
    //     '-preset ultrafast',
    //     '-g 15',
    //     '-keyint_min 15',
    //     '-profile:v baseline',
    //     '-level 3.0',
    //     '-pix_fmt yuv420p',
    //     '-r 15'
    // ])
    // .format('flv')
    // .on('start', (commandLine) => {
    //     console.log(commandLine);
    // })
    // .on('error', (err,stdout,stderr) =>{
    //     console.error('ffmpeg error', stderr);
    // })
    // .on('end', () => {
    //     console.log('transcode end')
    // })
    // .run()

},1000)




