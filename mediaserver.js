
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


class MediaServer 
{
    constructor(publicIp)
    {
        this.endpoint = medoozeMediaServer.createEndpoint(publicIp);
        medoozeMediaServer.enableDebug(true);
        medoozeMediaServer.enableUltraDebug(true);

        this.streams = new Map();
    }

    async createStream(streamName,rtmpUrl)
    {
        const streamer = medoozeMediaServer.createStreamer();
        const video = new MediaInfo(streamName+'video','video');

        //Add h264 codec
        video.addCodec(new CodecInfo('h264',96));

        let port = await this.getMediaPort();


        const session = streamer.createSession(video, {
	        local  : {
                port: port
	        }
        });

        // todo audio 

        this.streams.set(streamName, {
            video:session
        });

        let videoout = 'rtp://127.0.0.1:' + port;

        ffmpeg(rtmpUrl + streamName)
            .inputOptions([
                '-fflags nobuffer'
            ])
            .output(videoout)
            .outputOptions([
                '-vcodec copy',
                '-an',
                '-f rtp',
                '-payload_type 96'
            ])
            .on('start', (commandLine) => {
                console.log(commandLine);
            })
            .on('error', (err,stdout,stderr) =>{
                console.error('ffmpeg error', stderr);
            })
            on('end', () => {
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
    async offerStream(streamname, offerStr)
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
        const candidates = endpoint.getLocalCandidates();

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
            audio.setDirection(Direction.RECVONLY);
            //Add it to answer
            answer.addMedia(audio);    
        }

        let videoOffer = offer.getMedia('video');

        if (videoOffer)
        {
            let  video = new MediaInfo(videoOffer.getId(), 'video');
            let h264 = videoOffer.getCodec('h264');
            video.addCodec(h264);
            video.setDirection(Direction.RECVONLY);
            answer.addMedia(video);
        }

        transport.setLocalProperties({
            audio : answer.getMedia('audio'),
            video : answer.getMedia('video')
        });

        const outgoingStream  = transport.createOutgoingStream({
            audio: true,
            video: true
        });

        let videoSession = this.streams.get(streamname).video

        // now  we only attach video 
        outgoingStream.getVideoTracks()[0].attachTo(videoSession.getIncomingStreamTrack());

        const info = outgoingStream.getStreamInfo();

        answer.addStream(info);

        return answer.toString();
    }
}

module.exports = MediaServer;


