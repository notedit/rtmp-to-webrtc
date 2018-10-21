
const getPort = require('get-port');
const medoozeMediaServer = require('medooze-media-server');
const ffmpeg = require('fluent-ffmpeg');

const SemanticSDP	= require('semantic-sdp');
const SDPInfo		= SemanticSDP.SDPInfo;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;
const Direction		= SemanticSDP.Direction;
const CodecInfo		= SemanticSDP.CodecInfo;

const videoPt = 96;
const audioPt = 100;

class MediaServer 
{
    constructor(publicIp)
    {
        this.endpoint = medoozeMediaServer.createEndpoint(publicIp);
        medoozeMediaServer.enableDebug(true);
        medoozeMediaServer.enableUltraDebug(true);
        
        this.streams = new Map();
    }

    getStream(streamName) 
    {
        return this.streams.get(streamName)
    }

    removeStream(streamName) 
    {

        stream = this.streams.get(streamName) 

        if (stream) {

            if (stream.videoStreamer) {
                stream.videoStreamer.stop()
            }

            if (stream.audioStreamer) {
                stream.audioStreamer.stop()
            }
        }

        this.streams.delete(streamName)

    }

    async createStream(streamName,rtmpUrl)
    {

        const videoStreamer = medoozeMediaServer.createStreamer();
        const audioStreamer = medoozeMediaServer.createStreamer();

        const video = new MediaInfo(streamName+':video','video');
        const audio = new MediaInfo(streamName+':audio','audio');

        //Add h264 codec
        video.addCodec(new CodecInfo('h264',videoPt));
        audio.addCodec(new CodecInfo('opus',audioPt));


        // let videoPort = await this.getMediaPort();
        // let audioPort = await this.getMediaPort();

        let videoPort = 20000;
        let audioPort = 20002;

        const videoSession = videoStreamer.createSession(video, {
	        local : {
                port: videoPort
	        }
        });

        const audioSession = audioStreamer.createSession(audio, {
            local : {
                port: audioPort
            }
        });

        this.streams.set(streamName, {
            videoPort: videoPort,
            audioPort: audioPort,
            videoStreamer: videoStreamer,
            audioStreamer: audioStreamer,
            video:videoSession,
            audio:audioSession
        });

        let videoout = 'rtp://127.0.0.1:' + videoPort;
        let audioout = 'rtp://127.0.0.1:' + audioPort;

        ffmpeg(rtmpUrl)
            .inputOptions([
                //'-fflags nobuffer'
            ])
            .output(videoout)
            .outputOptions([
                '-flags:v +global_header',
                '-bsf:v h264_mp4toannexb,dump_extra',
                '-vcodec libx264',
                '-an',
                '-f rtp',
                '-payload_type ' + videoPt
            ])
            // video only
            // .output(audioout)
            // .outputOptions([
            //     '-acodec libopus',
            //     '-vn',
            //     '-f rtp',
            //     '-payload_type ' + audioPt
            // ])
            .on('start', (commandLine) => {
                console.log(commandLine);
            })
            .on('error', (err,stdout,stderr) =>{
                console.error('ffmpeg error', stderr);
            })
            .on('end', () => {
                console.log('transcode end')
            })
            .run()

    }
    async getMediaPort()
    {
        let port;
        while(true)
        {
            port = await getPort();
            if(port%2 == 0){
                break;
            }
        }
        return port;
    }
    async offerStream(streamName, offerStr)
    {
        let offer = SDPInfo.process(offerStr);

        const transport = this.endpoint.createTransport({
            dtls : offer.getDTLS(),
            ice : offer.getICE()
        });

        transport.setRemoteProperties({
            audio : offer.getMedia('audio'),
            video : offer.getMedia('video')
        });

        //Get local DTLS and ICE info
        const dtls = transport.getLocalDTLSInfo();
        const ice  = transport.getLocalICEInfo();

        //Get local candidates
        const candidates = this.endpoint.getLocalCandidates();

        let answer = new SDPInfo();

        answer.setDTLS(dtls);
        answer.setICE(ice);

        for (let i=0;i<candidates.length;++i)
        {
            answer.addCandidate(candidates[i]);
        }

        let audioOffer = offer.getMedia('audio');

        if (audioOffer) 
        {
            let  audio = new MediaInfo(audioOffer.getId(), 'audio');
            //Set recv only
            audio.setDirection(Direction.SENDONLY);
            //Add it to answer
            //answer.addMedia(audio);    
        }

        let videoOffer = offer.getMedia('video');

        let  video = new MediaInfo(videoOffer.getId(), 'video');
        let videocodec = videoOffer.getCodec('h264');
        video.addCodec(videocodec);
        video.setDirection(Direction.SENDONLY);
        answer.addMedia(video);

        console.log('answer', answer);

        transport.setLocalProperties({
            audio : answer.getMedia('audio'),
            video : answer.getMedia('video')
        });

        const outgoingStream  = transport.createOutgoingStream({
            video: true,
            audio: false
        });

        let videoSession = this.streams.get(streamName).video

        // now  we only attach video 
        outgoingStream.getVideoTracks()[0].attachTo(videoSession.getIncomingStreamTrack());

        const info = outgoingStream.getStreamInfo();

        answer.addStream(info);

        return answer.toString();
    }
}

module.exports = MediaServer;


