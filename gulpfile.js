const gulp = require("gulp");
const bs = require("browser-sync").create();
const pug = require('pug');
const gh = require('gh-pages')

const serve = (done) => {
  bs.init({
    server: { baseDir: "./public/" },
  });
  done();
};


const parseSongFile = (text) => {
  const lines = text.split('\n')
  let lastSong = {}
  const result = []
  let isMeta = false
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (l === '---') {
      if (!isMeta) {
        lastSong = {}
        result.push(lastSong)
      }
      isMeta = !isMeta
      continue
    }

    if (isMeta) {
      const found = l.indexOf(':');
      if (found === -1) {
        console.error('warn: no field sep - ' + l + ' - ignoring')
        continue
      }

      const name = l.slice(0, found).trim()
      let value = l.slice(found+1).trim()

      if (['artists', 'albums', 'tags'].indexOf(name) !== -1) {
        if (value.length === 0) value = []
        else value = value.split(',').map(e => e.trim())
      } else {
        value = value
      }

      lastSong[name] = value
    } else {
      if (lastSong.lyrics == null) lastSong.lyrics = [];
      lastSong.lyrics.push(l)
    }
  }

  for (let i = 0; i < result.length; i++) {
    result[i].lyrics = result[i].lyrics.join('\n').trim()
  }
  return result
}

// const hash = (seed) => {
//   let code = 0n;
//   const base = 65537n
//   const mod = 12342135937n;
//   for (let i in seed) {
//     code = (code + BigInt(seed.codePointAt(i))) % mod
//     code = (code * base) % mod;
//   }
//   return code.toString(36)
// }

const publish = (done) => {
  gh.publish('public', done)
}



const fs = require('fs');
const compile = (rootPath) => (done) => {

  const songTemplate = pug.compileFile('./pages/song.pug')
  const songFiles = fs.readdirSync('./data/song');
  const artists = {}
  const albums = {}
  const tags = {}

  const links = {}

  for (let i = 0; i < songFiles.length; i++) {
    const file = parseSongFile(''+fs.readFileSync('./data/song/' + songFiles[i]));
    for (let j = 0; j < file.length; j++) {
      const link = 'song/'+file[j].link+ '.html'
      const label = file[j].title
      fs.writeFileSync('./public/'+link, songTemplate({...file[j], rootPath}))
      links[link] = label
    }
  }

  const indexTemplate = pug.compileFile('./pages/index.pug')
  fs.writeFileSync('./public/index.html', indexTemplate({songs:links, rootPath}))

  done()
}

const reload = (done) => {
  bs.reload();
  done();
};

const watch = () => {
  gulp.watch('./data/*', gulp.series(compile(), reload))
  gulp.watch('./pages/*', gulp.series(compile(), reload))
  gulp.watch('**.css', reload)
}
exports.default = gulp.series(compile(), serve, watch);

exports.publish = gulp.series(compile('/kashi-demo'), publish)
