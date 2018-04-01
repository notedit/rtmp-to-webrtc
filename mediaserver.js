const medoozeMediaServer = require('medooze-media-server');
//Get Semantic SDP objects
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

        this.streams = {};
    }

    async createStream(streamName)
    {
        const streamer = medoozeMediaServer.createStreamer();
        const video = new MediaInfo("video","video");
        
        //Add h264 codec
        video.addCodec(new CodecInfo("h264",96));
        //Create session for video

        //https://github.com/medooze/media-server-demo-node/blob/master/index.js#L522
        const session = streamer.createSession(video, {
	        local  : {
                port: 5004
	        }
        });


    }
}



