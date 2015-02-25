module.exports = function (grunt) {
    "use strict";
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        requirejs: {
        	compile: {
        		options: {
        			name: "main",
        			baseUrl: "app/public/js",
        			include : ["vendor/require.js", "main.js"],
        			mainConfigFile: "app/public/js/config.js",
        			out: "public/app.js",
        			optimize: "none"
        		}
        	}
        },
        ejs: {
            options: {
            },

            'index.html': {
                src: 'app/server/views/index.ejs',
                dest: 'public/index.html'
            }
        },
        copy: {
        	main: {
        		expand: true, 
        		cwd: 'app/public/img/',
        		src: '**',
        		dest: 'public/img/',
        		flatten:true
        	},
        },
        
        
        mochacov: {
            options: {
                reporter: 'html-cov',
                require: ['should']
            },
            all: ['test/*.js']
        },
        blanket: {
            source: {
                src: ['app/server/'],
                dest: '.coverage/app/server/'
            },
            test: {
                src: ['test/'],
                dest: '.coverage/test/'
            }
        },
        mochaTest: {
            all: {
                options: {
                    reporter: 'spec',
                },
                src: ['test/**/*.js']
            },
            coverage: {
                options: {
                    reporter: 'html-cov',
                    quiet: true
                },
                src: ['.coverage/test/**/*.js'],
                dest: 'coverage.html'
            }
        },
        
        concat: {
            development_css: {
                options: {
                    separator: '\n'
                },

                files: {
                    'public/vendor.css': [
                        'app/public/css/backgrid.min.css',
                        'app/public/css/backgrid-paginator.min.css',
                        'app/public/css/bootstrap.min.css',
                        'app/public/css/style.css',
                        'app/public/css/bootstrap-responsive.min.css',
                        'app/public/css/base.css'
                    ]
                }
            }
        },

        jshint: {
            files: [
                'gruntfile.js',
                'app/server/**/*.js',
                'app/public/js/**/*.js',
                '!app/public/js/vendor/*.js',
                'test/**/*.js'],
            options: {
                // options here to override JSHint defaults
                globals: {
                    jQuery: true,
                    console: true,
                    module: true,
                    document: true
                }
            }
        },
        watch: {
            files: ['<%= jshint.files %>'],
            tasks: ['jshint']
        }
    });

    grunt.loadNpmTasks('grunt-ejs')
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-blanket');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-mocha-cov');

    grunt.registerTask('prod', ['requirejs', 'ejs', 'concat', 'copy']);
    grunt.registerTask('coverage', ['mochacov']);
    grunt.registerTask('test', ['mochaTest:all']);
    //grunt.registerTask('coverage', ['blanket', 'mochaTest:coverage']);
    grunt.registerTask('default', ['test', 'jshint']);

};
