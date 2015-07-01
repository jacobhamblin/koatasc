var scene, camera, renderer, $viewport, height, width, SEGMENTS;
var cameraMoveY = 0;
var currentIndex = 0;
var previousIndex = 0;
var orbsTimesRun = 0;
var soundsTimesRun = 0;
var orbImages = [];
var transitionSounds = [];
var orbPreImages = new Object;
var transitionPreSounds = new Object;
var mouse = new THREE.Vector2(), INTERSECTED;
var raycaster = new THREE.Raycaster();
THREE.bubbles = [];

SEGMENTS = [[0, 0, 40], [0, 50, 100], [0, 0, 200], ['link']];


window.request

setViewport($(document.body));

function setViewport($el) {
  $viewport = $el;

  width = $viewport.width();
  height = $viewport.height();

  function checkCount (orbs, desiredNumberofOrbs) {
    if (orbs.length === desiredNumberofOrbs) {
      $('.help-icon').click(function () {
        $('.help-container').toggleClass('is-active');
        $('.help-inner').toggleClass('is-active');
      });
      $('.help-container').click(function (event) {
        $('.help-container').toggleClass('is-active');
        $('.help-inner').toggleClass('is-active');
      })

      $('.load').html('');

      init();
      animate();
    }
  }

  loadImage("./images/bluGrn1-64.png", orbImages);
  loadImage("./images/bluGrn2-64.png", orbImages);
  loadImage("./images/bluGrn3-64.png", orbImages);
  loadImage("./images/bluGrn4-64.png", orbImages);
  loadImage("./images/bluGrn5-64.png", orbImages)
  loadImage("./images/prpl1-64.png", orbImages);
  loadImage("./images/prpl2-64.png", orbImages);
  loadImage("./images/prpl3-64.png", orbImages);
  loadAudio("./sounds/rumb.mp3", transitionSounds);
  loadAudio("./sounds/rumb1.mp3", transitionSounds);

  function loadAudio (url, transitionSounds, orbImages) {
    soundsTimesRun++;
    var fileName = url.match(/(\w+.mp3)/g)[0];
    transitionPreSounds[fileName] = new Audio(url);
    transitionSounds.push(transitionPreSounds[fileName]);
  }

  function loadImage (url, orbImages, transitionSounds) {
    orbsTimesRun++;
    orbPreImages['img' + orbsTimesRun] = document.createElement('img');
    orbPreImages['img' + orbsTimesRun].src = url;
    orbPreImages['img' + orbsTimesRun].addEventListener('load', function (event) {
      orbImages.push(THREE.ImageUtils.loadTexture(url));
      orbImages[orbImages.length - 1].image = orbPreImages['img' + orbsTimesRun];
      checkCount(orbImages, 8);
    });
  }

}

function init() {
  scene = new THREE.Scene();

  // renderer

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);
  $viewport.append(renderer.domElement);

  // camera

  camera = new THREE.PerspectiveCamera(50, width / height, 20, 90);
  camera.position.set(0, 0, 40);
  scene.add(camera);

  renderer.setClearColor(0x000000, 1);



  // light

  // var light = new THREE.AmbientLight ( 0x404040 );
  // scene.add(light);

  jQuery(window).on('resize', resize);
  $viewport.on('mousemove', mouseMove);
  $viewport.on('DOMMouseScroll mousewheel', scroll);
  jQuery(document).on('keydown', keyDown);

  function mouseMove (event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (event.clientY / window.innerHeight) * 2 + 1;
  }

  function scroll (event) {
    event.originalEvent.wheelDelta >= 0 ? prev() : next();
  }

  function prev () {
    if (currentIndex === 0) {
      return;
    } else if (currentIndex === SEGMENTS.length - 1) {
      $('#contact-div').css('top', '100vh');
      currentIndex = currentIndex - 1;
    } else {
      transitionPreSounds['rumb1.mp3'].play();
      animateCamera(currentIndex - 1);
    }
  }

  function next () {
    if (currentIndex === SEGMENTS.length - 2) {
      currentIndex = currentIndex + 1;
      $('#contact-div').css('top', '95vh');
      // $(function(){
        // $viewport.append("<div id='contact-div' style='top: 101vh;'></div>")
        // $('#contact-div').load("contact.html");
      // });
    } else if (currentIndex === SEGMENTS.length - 1) {
      return;
    } else {
      transitionPreSounds['rumb.mp3'].play();
      animateCamera(currentIndex + 1);
    }
  }

  function animateCamera (index) {
    if ( index > currentIndex ) {
      TweenMax.to(camera.position, 2, {
        x: SEGMENTS[index][0],
        y: SEGMENTS[index][1],
        z: SEGMENTS[index][2]
      })
      currentIndex = index;
      var coords = SEGMENTS[currentIndex];
      var vector = new THREE.Vector3(coords[0],coords[1],coords[2]);
      camera.lookAt(vector);
    } else {
      TweenMax.to(camera.position, 2, {
        x: SEGMENTS[index][0],
        y: SEGMENTS[index][1],
        z: SEGMENTS[index][2]
      })
      currentIndex = index;
      var coords = SEGMENTS[currentIndex];
      var vector = new THREE.Vector3(coords[0],coords[1],coords[2]);
      camera.lookAt(vector);
    }
  }

  function resize () {
    width = $viewport.width();
    height = $viewport.height();

    camera.aspect = width/height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
  }

  function keyDown (event) {
    // if (!isScrolling && isActive) {
      var keyCode = event.keyCode;

      if (keyCode === 40) {
        next();
      } else if (keyCode === 38) {
        prev();
      }
    // }
  }


  function addSegmentOneSprites(numberOfSprites, collection) {

    go(numberOfSprites, collection, 'close');
    go(numberOfSprites, collection, 'far');

    function go (numberOfSprites, collection, distance) {
      for (var i = 0; i < numberOfSprites; i++) {
        var matTexture = Math.floor(Math.random() * 8);
        var rotation = Math.random() * 6.283;
        matTexture === 1 || matTexture === 7 ? rotation = 0 : rotation = Math.random() * 6.283;
        var mat = new THREE.SpriteMaterial({
          map: collection[matTexture],
          color: 0xffffff,
          fog: true,
          rotation: rotation,
        })
        var bubble = new THREE.Sprite(mat);
        if (distance === 'close') {
          var x = (Math.random() * 15) - 7.5;
          var y = (Math.random() * 15) + 17.5;
          var z = (Math.random() * 15) + 42.5;
          var width = mat.map.image.width;
          var newSize = (Math.random() * ((width * .01) * Math.random()));
        } else if (distance === 'far') {
          var x = (Math.random() * 30) - 15;
          var y = (Math.random() * 30) + 10;
          var z = (Math.random() * 80) + 10;
          var width = mat.map.image.width;
          var newSize = (Math.random() * ((width * .016) * (Math.random() * 4) - 1.5)) * (Math.random() * ((width * .016) * (Math.random() * 4) - 1.5));
          bubble.newSize = newSize;
        }
        bubble.position.set(x, y, z);
        bubble.scale.set(newSize, newSize, 1);
        scene.add(bubble);
        THREE.bubbles.push(bubble);
      }
    }

  }

  function addSegmentOneSpheres () {
    var geometry = new THREE.SphereGeometry(3, 32, 32);
    var material = new THREE.MeshLambertMaterial({ color: 0x888888 });
    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    mesh.position.set(0, 25, 50);

    var geometry = new THREE.SphereGeometry(1, 32, 32);
    var material = new THREE.MeshLambertMaterial({ color: 0x888888 });
    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    mesh.position.set(-8, 27, 65);
  }

  // segment 0
  addSegmentZero();

  function addSegmentZero () {
    THREE.lightZero = new THREE.PointLight(0xffffff, 2, 40);
    THREE.lightZero.position.set(0, 0, 20);
    scene.add(THREE.lightZero);

    var trianglesCount = 80;
    THREE.triangles = [];
    for (var i = 0; i < trianglesCount; i++) {
      pyramid.radius = ((Math.random() + .5) * (Math.random() + .5) * (Math.random() + .5) * (Math.random() + .5));
      var geometry = new THREE.TetrahedronGeometry(radius, 0);
      var color = (Math.random() * .99) * 0xffffff;
      var material = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        shading: THREE.FlatShading,
        });
      var pyramid = new THREE.Mesh(geometry, material);
      scene.add(pyramid);
      var x = (Math.random() * 50) - 25
      var y = (Math.random() * 50) - 25;
      var z = (Math.random() * 60) - 60;
      pyramid.position.set(x, y, z);
      pyramid.rotX = Math.random() > .5 ? .05 - (pyramid.radius * .02) : -(.05 - pyramid.radius * .02);
      pyramid.rotY = Math.random() > .5 ? .05 - (pyramid.radius  * .02) : -(.05 - pyramid.radius * .02);
      pyramid.timing = Math.floor(Math.random() * 10);
      THREE.triangles.push(pyramid);
    }
    // scene.fog = THREE.Fog( 0x888888, 0.01 );
    // fog.position.set(0, 0, 0);
  }

  // segment 1
  addSegmentOne(orbImages);



  function addSegmentOne (orbImages) {
    THREE.lightOne = new THREE.PointLight(0xffffff, 2, 50);
    THREE.lightOne.position.set(0,50,25);
    scene.add(THREE.lightOne);

    THREE.lightTwo = new THREE.PointLight(0xffffff, 1, 10);
    THREE.lightTwo.position.set(-8, 32, 62);
    scene.add(THREE.lightTwo);

    addSegmentOneSpheres();
    addSegmentOneSprites(125, orbImages);
  }

  // controls

  THREE.controls = new THREE.OrbitControls(camera, renderer.domElement);
  THREE.controls.center.set (0,0,0);
  THREE.controls.userRotate = false;
  THREE.controls.userZoom = false;
}

// segment 2
addSegmentTwo();

function addSegmentTwo () {

}

function animate() {
  requestAnimationFrame(animate);
  // mouseOverInteract();

  // spin tetrahedrons, glitch out

  for (var i = 0; i < THREE.triangles.length; i++) {
    if (Math.round(new Date().getTime() * .001) % THREE.triangles[i].timing == 0) {
      var rotX = Math.random() > .5 ? .05 - (pyramid.radius * .02) : -(.05 - pyramid.radius * .02);
      var rotY = Math.random() > .5 ? .05 - (pyramid.radius * .02) : -(.05 - pyramid.radius * .02);

      THREE.triangles[i].rotation.x += rotX;
      THREE.triangles[i].rotation.y -= rotY;
    } else {
      THREE.triangles[i].rotation.x += THREE.triangles[i].rotX;
      THREE.triangles[i].rotation.y -= THREE.triangles[i].rotY;
    }

  }

  // COS move lightZero

  var oscillate = ((Math.cos(cameraMoveY) - 1) * 20);

  THREE.lightZero.position.set(oscillate + 20, oscillate + 20, oscillate);

  // orbs grow, shrink

  var time = performance.now();

  for ( var i = 0, l = THREE.bubbles.length; i < l; i ++ ) {

    var object = THREE.bubbles[ i ];
    if (object.newSize !== undefined) {
      var scale = (Math.cos(cameraMoveY) / 5) + object.newSize;
      object.scale.set( scale, scale, scale );
    }

  }

  // help scroll brightness

  if ($('.help-inner').css('display') === 'block') {
    $('.down.arrow').css('-webkit-filter', 'invert(' + (Math.cos(cameraMoveY) + 1) + ')');
  }
  $('.attention').css('-webkit-filter', 'opacity(' + (Math.cos(cameraMoveY) + 1) + ')');

  // orb lighting animation

  THREE.lightOne.intensity += Math.cos(cameraMoveY) / 50;

  function mouseOverInteract() {
      // update the picking ray with the camera and mouse position
  	raycaster.setFromCamera( mouse, camera );

  	// calculate objects intersecting the picking ray
  	var intersects = raycaster.intersectObjects( scene.children );

    if ( intersects.length > 0 ) {
      debugger

			if ( INTERSECTED != intersects[ 0 ].object ) {

				if ( INTERSECTED ) {
          INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
        }
				INTERSECTED = intersects[ 0 ].object;
				INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
				INTERSECTED.material.emissive.setHex( 0xff0000 );

			}

		} else {

			if ( INTERSECTED ) {
        // INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
      }
			INTERSECTED = null;

		}
  }

  camera.position.y += Math.cos(cameraMoveY) / 50;
  cameraMoveY += 0.02;

  camera.position.x += ((mouse.x * 5) - camera.position.x) * 0.03;
  renderer.render(scene, camera);
  THREE.controls.update();
}
