const fs = require("fs");
const ffmpeg = require('fluent-ffmpeg');

const composePromise = (...functions) =>
  initialValue =>
    functions.reduceRight(
      (sum, fn) => Promise.resolve(sum).then(fn),
      initialValue
    );

const twitter_criteria = (x)=>{
  res = x.videoCodec == 'h264' && (x.audioCodec == 'aac' || x.audioCodec === null) && x.duration <= 140 && 
         x.width <= 1920 && x.height <= 1900 && x.size <= 512000000 && x.format == 'mov,mp4,m4a,3gp,3g2,mj2';
  return res;
}

const mpegts = (x)=>{
  return x.format == 'mpegts';
}

const fs_meta = (h)=>{
  return new Promise((resolve, reject)=>{
    fs.stat(h.fullname, (err, res) =>{
      if (err) reject(err);
      resolve(Object.assign(h, {size:res['size'], time:res['birthtime']}));
    })
  });
}

const media_meta = (h)=>{
  return new Promise((resolve, reject) =>{
    ffmpeg.ffprobe(h.fullname, function(err, metadata) {
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
        res = Object.assign(h, {videoCodec, audioCodec, duration, width, height, format});
        resolve(res);
    });
  });
};


//::Path -> [{fullname:String}]
const files = (path)=>{
  return fs.readdirSync(path).map((filename=>{return {fullname:path + '\\' + filename}}));
}

const whole_meta = composePromise(media_meta, fs_meta);

const ts_format = (path)=>{
  return new Promise((resolve, reject)=>{
    let ps;
    ps = files(path).map(whole_meta);
    Promise.all(ps)
      .then(xs=>resolve(xs.filter(mpegts)))
      .catch(err=>reject(err));
  });
};

const meta_data = (path) =>{
  return Promise.all(files(path).map(whole_meta));
};

const invalid = (path) =>{
  return new Promise((resolve, reject)=>{
    let ps;
    ps = files(path).map(whole_meta);
    Promise.all(ps)
      .then(xs=>resolve(xs.filter(x=>{return !twitter_criteria(x)})))
      .catch(err=>reject(err));
  });
 };

exports.invalid = invalid;
exports.meta_data = meta_data;
exports.ts_format = ts_format;
exports.fs_meta = fs_meta;
exports.media_meta = media_meta;
exports.files = files;