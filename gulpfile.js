const { src, dest, series, task } = require('gulp');
const ts = require('gulp-typescript');
const del = require('del');

const tsProject = ts.createProject('tsconfig.json');

function clean() {
  return del('dist');
}

function build() {
  return src('src/**/*.ts')
    .pipe(tsProject())
    .pipe(dest('dist'));
}

task('clean', clean);
task('build', build);
task('default', series(clean, build));
