const gulp = require('gulp');
const obt = require('origami-build-tools');

gulp.task('build', function() {
	return obt.build(gulp, {
		js: './main.js',
		sass: './main.scss',
		buildJs: 'bundle.js',
		buildCss: 'bundle.css',
		buildFolder: 'build'
	});
});

gulp.task('verify', function() {
	return obt.verify(gulp);
});

gulp.task('watch', function() {
	gulp.watch('./src/**/*', ['build']);
});

gulp.task('default', ['verify', 'build']);