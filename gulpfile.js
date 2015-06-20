var gulp = require('gulp');
var babel = require('gulp-babel');
var cncat = require('gulp-concat');
var uglify = require('gulp-uglify');
var plumber = require('gulp-plumber');

var appPath = 'app/*.js';

gulp.task('babel', function () {
    gulp.src([appPath])
        .pipe(babel())
        .pipe(plumber())
        .pipe(cncat('application.js'))
        .pipe(gulp.dest('compiled'));
});

gulp.task('watch', function() {
  gulp.watch([appPath], ['babel']);
});

gulp.task('default', ['babel', 'watch']);
