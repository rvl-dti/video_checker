const fs = require("fs");
const ffmpeg = require('fluent-ffmpeg');
const dotenv = require('dotenv');
dotenv.config();
const path = process.env.VIDEO_FOLDER;
//const path = 'X:\\n\\projects\\vanloon\\videoserv\\video';

const twitter_criteria = (x)=>{
  res = x.videoCodec == 'h264' && (x.audioCodec == 'aac' || x.audioCodec === null) && x.duration <= 140 && 
         x.width <= 1920 && x.height <= 1900 && x.size <= 512000000 && x.format == 'mov,mp4,m4a,3gp,3g2,mj2';
  return res;
}

const getMeta = (fullname)=>{
  return new Promise((resolve, reject) =>{
    ffmpeg.ffprobe(fullname, function(err, metadata) {
        if (err) {
          reject(err);
        }
        var audioCodec = null;
        var videoCodec = null;
        var width, height, duration, format;
        format = metadata.format.format_name;
        metadata.streams.forEach(function(stream){
            if (stream.codec_type === "video"){
                videoCodec = stream.codec_name;
                width = stream.width;
                height = stream.height;
                duration = stream.duration;
              }
            else if (stream.codec_type === "audio")
            {
                audioCodec = stream.codec_name;
            }
        });
        res = {fullname, videoCodec, audioCodec, duration, width, height, format};
        resolve(res);
    });
  });
};

const getSize = (h=>{
  return new Promise((resolve, reject)=>{
    fs.stat(h.fullname, (err, res) =>{
      if (err) reject(err);
      resolve(Object.assign(h, {size:res['size'], time:res['birthtime']}));
    })
  })
})

let fullnames  = fs.readdirSync(path).map((filename=>path + '\\' + filename));
let ps = fullnames.map(fullname=>getMeta(fullname));
Promise.all(ps)
.then(values=>{
  let ns = values.map(h=>getSize(h));
  return Promise.all(ns);
})
.then(xs=>{
  let res = xs.filter((x)=>!twitter_criteria(x));
  console.log(res);
  console.log(res.length);
})
.catch(err=>console.log(err));