/* eslint-env node */
var gulp = require('gulp');
var concat = require('gulp-concat');
//var uglify = require('gulp-uglify');
var cleanCSS = require('gulp-clean-css');
var base64 = require('gulp-base64');
var inject = require('gulp-inject');
var size = require('gulp-size');
var uglifyes = require('uglify-es');
var composer = require('gulp-uglify/composer');
var uglify = composer(uglifyes, console);
var order = require("gulp-order");
var nologs = require("gulp-remove-logging");

gulp.task('minify-concat-js', function () {
	// Minify and concat all JavaScripts
	return gulp.src('./js/*.js')	// put in order
	.pipe(nologs())
	.pipe(order([
		"jsfxr.min.js",
		"pixelfont.min.js",
		"TinyAnimate.min.js",
		"game.js"
	]))
	.pipe(uglify({
		mangle: {
			toplevel: true,
			reserved: ["endTurn", "TA"]
		},
		compress: {
			ecma: 6,
			passes: 2,
			drop_console: true,
			pure_getters: true,
			toplevel: true,
			unsafe_arrows: true,
			warnings: true
		}
	}))
	.pipe(concat('all.min.js'))
	.pipe(gulp.dest('./bundled/'));
});

gulp.task('minify-css-inline-images', function () {
	return gulp.src('./game.css')
	.pipe(cleanCSS())
	.pipe(base64())	// slip the images in there as data
	.pipe(gulp.dest('./bundled/'));
});

gulp.task('inject-html', ['minify-concat-js', 'minify-css-inline-images'], function () {
	return gulp.src('./index.html')
	.pipe(inject(gulp.src(['./bundled/all.min.js']), {
		transform: (filepath, file) => file.contents.toString()
	}))
	.pipe(inject(gulp.src(['./bundled/game.css']), {
		transform: (filepath, file) => file.contents.toString()
	}))
	.pipe(gulp.dest('./bundled/'))
	.pipe(size());
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['inject-html']);
