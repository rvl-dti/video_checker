const fs = require("fs");
const ffmpeg = require('fluent-ffmpeg');
const get = require('./get');
const { exec } = require('child_process');
const dotenv = require('dotenv');
dotenv.config();
const path = process.env.VIDEO_FOLDER;
const clog = console.log;
let option;

const replace_ext = (fullname, ext)=>{
  let arr, path, filename;
  arr = fullname.split('\\');
  path = arr.slice(0, arr.length-1).join('\\');
  filename = arr[arr.length-1];
  return path + '\\' + filename.split('.')[0] + '.' + ext;
}

const rename = (fullname, ext)=>{
  return new Promise((resolve, reject)=>{
    let outname;
    outname = replace_ext(fullname, ext);
    fs.rename(fullname, outname, (err)=>{
      if (err) reject(err);
      resolve(outname);
    });
  })
}

const convert = (fullname) => {
  return new Promise((resolve, reject)=>{
    const outname = replace_ext(fullname, 'mp4');
    exec('ffmpeg -i ' + fullname + ' -acodec copy -vcodec copy ' + outname, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve(outname);
      }
    });
  })
}

let p;
option = process.argv[2];
if (option) {
  switch (option.toLowerCase()){
    case 'check':
      p = get.invalid(path);
      p.then(xs=>{
        clog(xs);
        clog('you have ' + xs.length + ' files that not meet twitter creteria');
      });
      break;
    case 'rename':
      p = get.ts_format(path);
      p.then(xs=>{
        return Promise.all(xs.map(x=>rename(x.fullname, 'ts')))
      })
      .then(xs=>console.log(xs));
      break;
    case 'convert':
        p = get.ts_format(path);
        p.then(xs=>{
          return Promise.all(xs.map(x=>rename(x.fullname, 'ts')))
        })
        .then(xs=>{
          return Promise.all(xs.map(convert));
        })
        .then(xs=>console.log(xs));
      break;
  }
}