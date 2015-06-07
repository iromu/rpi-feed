# rPi feed

[![Build Status][travis-image]][travis-url]
[![Coverage Status][coveralls-image]][coveralls-url]
[![Dependency Status][dep-image]][dep-url]
[![Dev Dependency Status][dev-dep-image]][dev-dep-url]

Raspicam nodejs socket.io generic streamer. Optimized read/write operations with memory mapped folder ```/dev/shm/rpi-feed/```

## Usage

### Prerequisites

    $ npm install -g bower grunt-cli

### Building from sources
Run these commands

      $ npm install
    
      $ bower install
      
      $ grunt --force
      

### Deploy to Raspberry Pi
Install forever 

    $ npm install -g forever

You can deploy with `grunt ssh_deploy:pi` or rolling back with `grunt ssh_rollback:pi`.

For the first cold deploy, you must launch the npm install process, and setup your own 
environment. For options reference, visit [grunt-ssh-deploy README][grunt-ssh-deploy-url]


Modify this section at Gruntfile.js

     pi: {
            options: {
              host: 'pi1.local',
              username: 'pi',
              privateKey: require('fs').readFileSync(process.env.HOME + '/.ssh/id_rsa'),
              before_deploy: 'cd /home/pi/apps/rpi-feed/current && forever stop "rpi-feed"',
              after_deploy: 'cd /home/pi/apps/rpi-feed/current && ' +
              'ln -s /home/pi/apps/rpi-feed/node_modules node_modules && ' +
                //'npm --production install && ' +
              'NODE_ENV=production PORT=8080 forever start --uid "rpi-feed" -a server/app.js'
            }
          }

Uncomment `'npm --production install && '` for the first deploy.



[travis-image]: https://travis-ci.org/iromu/rpi-feed.svg?branch=develop
[travis-url]: https://travis-ci.org/iromu/rpi-feed

[coveralls-image]: https://coveralls.io/repos/iromu/rpi-feed/badge.svg?branch=develop
[coveralls-url]: https://coveralls.io/r/iromu/rpi-feed?branch=develop

[dep-image]: https://david-dm.org/iromu/rpi-feed.svg
[dep-url]: https://david-dm.org/iromu/rpi-feed#info=dependencies&view=table

[dev-dep-image]: https://david-dm.org/iromu/rpi-feed/dev-status.svg
[dev-dep-url]: https://david-dm.org/iromu/rpi-feed#info=devDependencies&view=table

[grunt-ssh-deploy-url]: https://github.com/dasuchin/grunt-ssh-deploy/blob/master/README.md
